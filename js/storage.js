/**
 * NutriTrack — Storage & Calcoli Nutrizionali
 */

const STORAGE_KEY = 'nutritrack_state_v1';

const MEAL_TYPES = [
  { id: 'colazione', label: 'Colazione', icon: '☀️', hint: '20-25% del fabbisogno' },
  { id: 'pranzo', label: 'Pranzo', icon: '🍝', hint: '35-40% del fabbisogno' },
  { id: 'cena', label: 'Cena', icon: '🌙', hint: '30-35% del fabbisogno' },
  { id: 'spuntini', label: 'Spuntini', icon: '🍎', hint: '10-15% del fabbisogno' }
];

const MACRO_PRESETS = {
  balanced: { label: 'Mediterranea Bilanciata', carbsPct: 48, proteinPct: 25, fatPct: 27 },
  fitness:  { label: 'Proteica / Fitness',      carbsPct: 42, proteinPct: 32, fatPct: 26 },
  lowcarb:  { label: 'Low Carb',                carbsPct: 25, proteinPct: 38, fatPct: 37 },
  keto:     { label: 'Chetogenica',             carbsPct: 6,  proteinPct: 26, fatPct: 68 }
};

const ACTIVITY_LEVELS = {
  sedentary:   { label: 'Sedentario (poco o nessun esercizio)', factor: 1.2 },
  light:       { label: 'Leggero (1-3 allenamenti / sett.)', factor: 1.375 },
  moderate:    { label: 'Moderato (3-5 allenamenti / sett.)', factor: 1.55 },
  active:      { label: 'Attivo (6-7 allenamenti / sett.)', factor: 1.725 },
  very_active: { label: 'Molto attivo (lavoro fisico / 2x giorno)', factor: 1.9 }
};

const GOAL_MODES = {
  lose_fast: { label: 'Dimagrimento deciso (-500 kcal)', delta: -500 },
  lose:      { label: 'Dimagrimento graduale (-350 kcal)', delta: -350 },
  maintain:  { label: 'Mantenimento peso (0 kcal)', delta: 0 },
  gain:      { label: 'Aumento massa muscolare (+300 kcal)', delta: 300 }
};

function round1(val) {
  return Math.round((Number(val) || 0) * 10) / 10;
}

function formatDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function shiftDateKey(key, deltaDays) {
  const dt = parseDateKey(key);
  dt.setDate(dt.getDate() + deltaDays);
  return formatDateKey(dt);
}

function formatHumanDate(key) {
  const todayKey = formatDateKey(new Date());
  if (key === todayKey) return 'Oggi';
  if (key === shiftDateKey(todayKey, -1)) return 'Ieri';
  if (key === shiftDateKey(todayKey, 1)) return 'Domani';

  const dt = parseDateKey(key);
  return dt.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function computeTargetsFromProfile(profile) {
  const weight = Number(profile.weightKg) || 72;
  const height = Number(profile.heightCm) || 175;
  const age = Number(profile.age) || 30;
  const sexOffset = profile.sex === 'F' ? -161 : 5;

  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset);
  const actFactor = (ACTIVITY_LEVELS[profile.activityLevel] || ACTIVITY_LEVELS.light).factor;
  const tdee = Math.round(bmr * actFactor);
  const delta = (GOAL_MODES[profile.goalMode] || GOAL_MODES.maintain).delta;
  const minSafe = profile.sex === 'F' ? 1200 : 1450;
  const kcal = Math.max(minSafe, tdee + delta);

  const preset = MACRO_PRESETS[profile.macroPreset] || MACRO_PRESETS.balanced;
  const carbs = Math.round((kcal * (preset.carbsPct / 100)) / 4);
  const protein = Math.round((kcal * (preset.proteinPct / 100)) / 4);
  const fat = Math.round((kcal * (preset.fatPct / 100)) / 9);
  const fiber = Math.max(25, Math.round((kcal / 1000) * 14));
  const waterMl = Math.round((weight * 33) / 100) * 100;

  return {
    bmr,
    tdee,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sugarsMax: Math.round((kcal * 0.1) / 4),
    saturatedFatMax: Math.round((kcal * 0.1) / 9),
    sodiumMax: 2000,
    waterMl: Math.max(1800, Math.min(4000, waterMl))
  };
}

function createDefaultState() {
  const defaultProfile = {
    name: '',
    sex: 'M',
    age: 30,
    heightCm: 175,
    weightKg: 74,
    targetWeightKg: 70,
    activityLevel: 'light',
    goalMode: 'maintain',
    macroPreset: 'balanced',
    useAutoTargets: true,
    theme: 'dark'
  };
  const autoTargets = computeTargetsFromProfile(defaultProfile);

  return {
    version: 1,
    profile: defaultProfile,
    targets: { ...autoTargets },
    days: {},
    customFoods: [],
    favoriteIds: ['it_pasta_semola_cruda', 'it_petto_pollo_crudo', 'it_olio_evo', 'it_yogurt_greco_0', 'it_uovo_intero'],
    recentFoodIds: [],
    cachedOnlineFoods: {},
    weightLog: [
      { date: formatDateKey(new Date()), weightKg: 74 }
    ]
  };
}

class NutriStorage {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw);
      const def = createDefaultState();
      return {
        ...def,
        ...parsed,
        profile: { ...def.profile, ...(parsed.profile || {}) },
        targets: { ...def.targets, ...(parsed.targets || {}) },
        days: parsed.days || {},
        customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
        favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds : def.favoriteIds,
        recentFoodIds: Array.isArray(parsed.recentFoodIds) ? parsed.recentFoodIds : [],
        cachedOnlineFoods: parsed.cachedOnlineFoods || {},
        weightLog: Array.isArray(parsed.weightLog) ? parsed.weightLog : def.weightLog
      };
    } catch (e) {
      console.warn('Errore caricamento dati salvati, uso valori predefiniti:', e);
      return createDefaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Impossibile salvare nello storage locale:', e);
    }
  }

  ensureDay(dateKey) {
    if (!this.state.days[dateKey]) {
      this.state.days[dateKey] = {
        meals: {
          colazione: [],
          pranzo: [],
          cena: [],
          spuntini: []
        },
        waterMl: 0,
        activities: [],
        notes: ''
      };
    }
    return this.state.days[dateKey];
  }

  getDay(dateKey) {
    return this.state.days[dateKey] || {
      meals: { colazione: [], pranzo: [], cena: [], spuntini: [] },
      waterMl: 0,
      activities: [],
      notes: ''
    };
  }

  scaleFood(food, grams) {
    const g = Math.max(0, Number(grams) || 0);
    const ratio = g / 100;
    return {
      grams: round1(g),
      kcal: Math.round((Number(food.kcal) || 0) * ratio),
      protein: round1((Number(food.protein) || 0) * ratio),
      carbs: round1((Number(food.carbs) || 0) * ratio),
      sugars: round1((Number(food.sugars) || 0) * ratio),
      fat: round1((Number(food.fat) || 0) * ratio),
      saturatedFat: round1((Number(food.saturatedFat) || 0) * ratio),
      fiber: round1((Number(food.fiber) || 0) * ratio),
      sodium: Math.round((Number(food.sodium) || 0) * ratio)
    };
  }

  addFoodEntry(dateKey, mealId, food, grams) {
    const day = this.ensureDay(dateKey);
    const scaled = this.scaleFood(food, grams);
    const entry = {
      entryId: 'ent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      foodId: food.id,
      name: food.name,
      brand: food.brand || '',
      grams: scaled.grams,
      servingName: food.servingName || '100 g',
      servingGrams: food.servingGrams || 100,
      per100: {
        kcal: Number(food.kcal) || 0,
        protein: Number(food.protein) || 0,
        carbs: Number(food.carbs) || 0,
        sugars: Number(food.sugars) || 0,
        fat: Number(food.fat) || 0,
        saturatedFat: Number(food.saturatedFat) || 0,
        fiber: Number(food.fiber) || 0,
        sodium: Number(food.sodium) || 0
      },
      ...scaled,
      createdAt: Date.now()
    };

    if (!day.meals[mealId]) day.meals[mealId] = [];
    day.meals[mealId].push(entry);

    // Cache online food if needed & add to recents
    if (String(food.id).startsWith('off_')) {
      this.state.cachedOnlineFoods[food.id] = food;
    }
    if (!String(food.id).startsWith('quick_')) {
      this.state.recentFoodIds = [
        food.id,
        ...this.state.recentFoodIds.filter((id) => id !== food.id)
      ].slice(0, 25);
    }

    this.save();
    return entry;
  }

  updateFoodEntryGrams(dateKey, mealId, entryId, newGrams) {
    const day = this.state.days[dateKey];
    if (!day || !day.meals[mealId]) return false;
    const item = day.meals[mealId].find((e) => e.entryId === entryId);
    if (!item) return false;

    const scaled = this.scaleFood(item.per100, newGrams);
    Object.assign(item, scaled);
    this.save();
    return true;
  }

  removeFoodEntry(dateKey, mealId, entryId) {
    const day = this.state.days[dateKey];
    if (!day || !day.meals[mealId]) return false;
    day.meals[mealId] = day.meals[mealId].filter((e) => e.entryId !== entryId);
    this.save();
    return true;
  }

  copyMealFromDate(fromDateKey, toDateKey, mealId) {
    const srcDay = this.state.days[fromDateKey];
    if (!srcDay || !srcDay.meals[mealId] || srcDay.meals[mealId].length === 0) {
      return 0;
    }
    const dstDay = this.ensureDay(toDateKey);
    let count = 0;
    for (const item of srcDay.meals[mealId]) {
      dstDay.meals[mealId].push({
        ...item,
        entryId: 'ent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        createdAt: Date.now()
      });
      count++;
    }
    this.save();
    return count;
  }

  addWater(dateKey, deltaMl) {
    const day = this.ensureDay(dateKey);
    day.waterMl = Math.max(0, Math.min(8000, (day.waterMl || 0) + deltaMl));
    this.save();
    return day.waterMl;
  }

  addActivity(dateKey, name, minutes, burnedKcal) {
    const day = this.ensureDay(dateKey);
    day.activities.push({
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: name || 'Allenamento',
      minutes: Math.max(1, Math.round(Number(minutes) || 30)),
      kcal: Math.max(1, Math.round(Number(burnedKcal) || 150))
    });
    this.save();
  }

  removeActivity(dateKey, actId) {
    const day = this.state.days[dateKey];
    if (!day) return;
    day.activities = (day.activities || []).filter((a) => a.id !== actId);
    this.save();
  }

  getDaySummary(dateKey) {
    const day = this.getDay(dateKey);
    const totals = {
      kcal: 0,
      protein: 0,
      carbs: 0,
      sugars: 0,
      fat: 0,
      saturatedFat: 0,
      fiber: 0,
      sodium: 0
    };
    const mealSummaries = {};

    for (const m of MEAL_TYPES) {
      const items = (day.meals && day.meals[m.id]) || [];
      const mSum = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: items.length };
      for (const it of items) {
        mSum.kcal += Number(it.kcal) || 0;
        mSum.protein += Number(it.protein) || 0;
        mSum.carbs += Number(it.carbs) || 0;
        mSum.fat += Number(it.fat) || 0;

        totals.kcal += Number(it.kcal) || 0;
        totals.protein += Number(it.protein) || 0;
        totals.carbs += Number(it.carbs) || 0;
        totals.sugars += Number(it.sugars) || 0;
        totals.fat += Number(it.fat) || 0;
        totals.saturatedFat += Number(it.saturatedFat) || 0;
        totals.fiber += Number(it.fiber) || 0;
        totals.sodium += Number(it.sodium) || 0;
      }
      mSum.kcal = Math.round(mSum.kcal);
      mSum.protein = round1(mSum.protein);
      mSum.carbs = round1(mSum.carbs);
      mSum.fat = round1(mSum.fat);
      mealSummaries[m.id] = mSum;
    }

    totals.kcal = Math.round(totals.kcal);
    totals.protein = round1(totals.protein);
    totals.carbs = round1(totals.carbs);
    totals.sugars = round1(totals.sugars);
    totals.fat = round1(totals.fat);
    totals.saturatedFat = round1(totals.saturatedFat);
    totals.fiber = round1(totals.fiber);
    totals.sodium = Math.round(totals.sodium);

    const burnedKcal = (day.activities || []).reduce((acc, a) => acc + (Number(a.kcal) || 0), 0);
    const targets = this.state.targets;
    const netBudget = (targets.kcal || 2000) + burnedKcal;
    const remainingKcal = netBudget - totals.kcal;

    return {
      dateKey,
      day,
      totals,
      mealSummaries,
      burnedKcal,
      netBudget,
      remainingKcal,
      waterMl: day.waterMl || 0,
      targets
    };
  }

  getAllLocalFoods() {
    return [...this.state.customFoods, ...(window.BUILTIN_FOODS || [])];
  }

  findFoodById(foodId) {
    const local = this.getAllLocalFoods().find((f) => f.id === foodId);
    if (local) return local;
    if (this.state.cachedOnlineFoods[foodId]) {
      return this.state.cachedOnlineFoods[foodId];
    }
    return null;
  }

  addCustomFood(foodData) {
    const food = {
      id: 'custom_' + Date.now(),
      name: String(foodData.name || 'Alimento personalizzato').trim(),
      brand: String(foodData.brand || 'Mio alimento').trim(),
      category: foodData.category || 'all',
      servingName: foodData.servingName || `1 porzione (${foodData.servingGrams || 100} g)`,
      servingGrams: Math.max(1, Number(foodData.servingGrams) || 100),
      kcal: Math.max(0, Number(foodData.kcal) || 0),
      protein: Math.max(0, Number(foodData.protein) || 0),
      carbs: Math.max(0, Number(foodData.carbs) || 0),
      sugars: Math.max(0, Number(foodData.sugars) || 0),
      fat: Math.max(0, Number(foodData.fat) || 0),
      saturatedFat: Math.max(0, Number(foodData.saturatedFat) || 0),
      fiber: Math.max(0, Number(foodData.fiber) || 0),
      sodium: Math.max(0, Number(foodData.sodium) || 0),
      isCustom: true
    };
    this.state.customFoods.unshift(food);
    this.save();
    return food;
  }

  deleteCustomFood(foodId) {
    this.state.customFoods = this.state.customFoods.filter((f) => f.id !== foodId);
    this.state.favoriteIds = this.state.favoriteIds.filter((id) => id !== foodId);
    this.state.recentFoodIds = this.state.recentFoodIds.filter((id) => id !== foodId);
    this.save();
  }

  toggleFavorite(food) {
    const id = food.id;
    const idx = this.state.favoriteIds.indexOf(id);
    if (idx >= 0) {
      this.state.favoriteIds.splice(idx, 1);
    } else {
      this.state.favoriteIds.unshift(id);
      if (String(id).startsWith('off_')) {
        this.state.cachedOnlineFoods[id] = food;
      }
    }
    this.save();
    return idx < 0;
  }

  isFavorite(foodId) {
    return this.state.favoriteIds.includes(foodId);
  }

  logWeight(dateKey, weightKg) {
    const w = round1(weightKg);
    if (w < 25 || w > 350) return false;
    const existing = this.state.weightLog.find((item) => item.date === dateKey);
    if (existing) {
      existing.weightKg = w;
    } else {
      this.state.weightLog.push({ date: dateKey, weightKg: w });
    }
    this.state.weightLog.sort((a, b) => a.date.localeCompare(b.date));
    this.state.profile.weightKg = w;
    if (this.state.profile.useAutoTargets) {
      this.state.targets = computeTargetsFromProfile(this.state.profile);
    }
    this.save();
    return true;
  }

  updateProfileAndTargets(profileUpdates, manualTargets = null) {
    this.state.profile = {
      ...this.state.profile,
      ...profileUpdates
    };
    if (this.state.profile.useAutoTargets) {
      this.state.targets = computeTargetsFromProfile(this.state.profile);
    } else if (manualTargets) {
      const autoRef = computeTargetsFromProfile(this.state.profile);
      this.state.targets = {
        ...autoRef,
        kcal: Math.max(800, Math.round(Number(manualTargets.kcal) || 2000)),
        protein: Math.max(10, Math.round(Number(manualTargets.protein) || 120)),
        carbs: Math.max(0, Math.round(Number(manualTargets.carbs) || 220)),
        fat: Math.max(10, Math.round(Number(manualTargets.fat) || 65)),
        fiber: Math.max(5, Math.round(Number(manualTargets.fiber) || 28)),
        waterMl: Math.max(500, Math.round(Number(manualTargets.waterMl) || 2200))
      };
    }
    this.save();
  }

  getStreakDays() {
    let streak = 0;
    let cursor = formatDateKey(new Date());
    // If today has 0 entries yet, check starting from yesterday so streak isn't broken in morning
    if (this.getDaySummary(cursor).totals.kcal === 0) {
      cursor = shiftDateKey(cursor, -1);
    }
    while (streak < 365) {
      const sum = this.getDaySummary(cursor);
      if (sum.totals.kcal > 0) {
        streak++;
        cursor = shiftDateKey(cursor, -1);
      } else {
        break;
      }
    }
    return streak;
  }

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
      throw new Error('File di backup non valido');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    this.state = this.load();
  }

  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = createDefaultState();
    this.save();
  }
}

window.MEAL_TYPES = MEAL_TYPES;
window.MACRO_PRESETS = MACRO_PRESETS;
window.ACTIVITY_LEVELS = ACTIVITY_LEVELS;
window.GOAL_MODES = GOAL_MODES;
window.formatDateKey = formatDateKey;
window.parseDateKey = parseDateKey;
window.shiftDateKey = shiftDateKey;
window.formatHumanDate = formatHumanDate;
window.computeTargetsFromProfile = computeTargetsFromProfile;
window.round1 = round1;
window.nutriStorage = new NutriStorage();
