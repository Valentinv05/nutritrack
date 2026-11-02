/**
 * NutriTrack — Controller Principale UI & Interazioni PWA
 */

(function () {
  const storage = window.nutriStorage;
  const api = window.nutriApi;
  const charts = window.nutriCharts;

  const RING_CIRCUMFERENCE = 2 * Math.PI * 61; // r = 61 => 383.274

  function guessDefaultMeal() {
    const h = new Date().getHours();
    if (h < 11) return 'colazione';
    if (h < 15) return 'pranzo';
    if (h >= 18 && h <= 22) return 'cena';
    return 'spuntini';
  }

  const uiState = {
    activeTab: 'diary',
    selectedDate: window.formatDateKey(new Date()),
    targetMeal: guessDefaultMeal(),
    foodSource: 'local', // local | favorites | recent | custom | online
    foodCategory: 'all',
    searchQuery: '',
    onlineResults: [],
    onlineLoading: false,
    onlineError: '',
    statsDays: 7,
    activeModalFood: null, // food object when adding or editing
    editingEntry: null,    // { dateKey, mealId, entryId } when editing existing entry
    activeMet: 4.3,
    deferredInstallPrompt: null,
    aiImage: null,
    aiResult: null,
    pendingChatBatch: null
  };

  let onlineSearchAbort = null;
  let onlineDebounceTimer = null;
  const barcodeScanner = new api.LiveBarcodeScanner();

  // ==================== HELPERS ====================
  const $ = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function showToast(msg) {
    const container = $('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 2300);
  }

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    const meta = $('meta-theme-color');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f1f5f9' : '#0b1120');
    const btn = $('btn-toggle-theme');
    if (btn) btn.textContent = t === 'light' ? '☀️' : '🌙';
  }

  function openModal(id) {
    const el = $(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    const el = $(id);
    if (el) el.classList.remove('open');
    if (id === 'modal-scanner') {
      barcodeScanner.stop();
    }
  }

  // ==================== NAVIGATION & DATE BAR ====================
  function switchTab(tabId) {
    uiState.activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${tabId}`);
    });
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Show date bar on Diary and Foods tabs for clear context
    const dateBar = $('date-nav-bar');
    if (dateBar) {
      dateBar.classList.toggle('hidden', tabId === 'profile');
    }

    if (tabId === 'diary') renderDiary();
    if (tabId === 'foods') renderFoodsTab();
    if (tabId === 'stats') renderStatsTab();
    if (tabId === 'profile') populateProfileForm();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderHeaderAndDate() {
    const streak = storage.getStreakDays();
    $('streak-badge').textContent = `🔥 ${streak} gg`;

    const todayKey = window.formatDateKey(new Date());
    $('current-date-label').textContent = window.formatHumanDate(uiState.selectedDate);

    const dt = window.parseDateKey(uiState.selectedDate);
    $('current-date-sub').textContent = dt.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    $('date-picker-input').value = uiState.selectedDate;
    $('btn-today-jump').classList.toggle('hidden', uiState.selectedDate === todayKey);
  }

  function setDate(newDateKey) {
    if (!newDateKey) return;
    uiState.selectedDate = newDateKey;
    renderHeaderAndDate();
    if (uiState.activeTab === 'diary') renderDiary();
    if (uiState.activeTab === 'stats') renderStatsTab();
  }

  // ==================== TAB 1: DIARIO ====================
  function setBarProgress(barEl, current, target, dangerWhenOver = false) {
    if (!barEl) return;
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    barEl.style.width = `${pct}%`;
    if (dangerWhenOver && target > 0 && current > target) {
      barEl.style.background = 'var(--color-danger)';
    } else {
      barEl.style.background = '';
    }
  }

  function renderDiary() {
    renderHeaderAndDate();
    const summary = storage.getDaySummary(uiState.selectedDate);
    const { totals, targets, burnedKcal, netBudget, remainingKcal, waterMl, mealSummaries, day } = summary;

    // Calorie Ring & Numbers
    $('stat-eaten-kcal').textContent = totals.kcal;
    $('stat-burned-kcal').textContent = burnedKcal;
    $('stat-budget-pill').textContent = `Budget ${netBudget} kcal`;

    const isOver = remainingKcal < 0;
    $('stat-remaining-kcal').textContent = isOver ? `+${Math.abs(remainingKcal)}` : remainingKcal;
    $('stat-remaining-kcal').style.color = isOver ? 'var(--color-danger)' : 'var(--text-primary)';
    $('stat-remaining-label').textContent = isOver ? 'kcal oltre il budget' : 'kcal rimanenti';

    const ringCircle = $('ring-progress-circle');
    const ratio = netBudget > 0 ? Math.min(1, totals.kcal / netBudget) : 0;
    const offset = RING_CIRCUMFERENCE * (1 - ratio);
    ringCircle.style.strokeDasharray = RING_CIRCUMFERENCE.toFixed(2);
    ringCircle.style.strokeDashoffset = offset.toFixed(2);
    ringCircle.style.stroke = isOver ? 'var(--color-danger)' : 'var(--accent-primary)';

    // Primary Macros
    const cPct = targets.carbs > 0 ? Math.round((totals.carbs / targets.carbs) * 100) : 0;
    const pPct = targets.protein > 0 ? Math.round((totals.protein / targets.protein) * 100) : 0;
    const fPct = targets.fat > 0 ? Math.round((totals.fat / targets.fat) * 100) : 0;

    $('macro-carbs-pct').textContent = `${cPct}%`;
    $('macro-carbs-val').innerHTML = `${Math.round(totals.carbs)} <span>/ ${targets.carbs}g</span>`;
    setBarProgress($('macro-carbs-bar'), totals.carbs, targets.carbs);

    $('macro-protein-pct').textContent = `${pPct}%`;
    $('macro-protein-val').innerHTML = `${Math.round(totals.protein)} <span>/ ${targets.protein}g</span>`;
    setBarProgress($('macro-protein-bar'), totals.protein, targets.protein);

    $('macro-fat-pct').textContent = `${fPct}%`;
    $('macro-fat-val').innerHTML = `${Math.round(totals.fat)} <span>/ ${targets.fat}g</span>`;
    setBarProgress($('macro-fat-bar'), totals.fat, targets.fat);

    // Micronutrients
    $('micro-fiber-val').textContent = `${totals.fiber} / ${targets.fiber || 28} g`;
    setBarProgress($('micro-fiber-bar'), totals.fiber, targets.fiber || 28);

    $('micro-sugars-val').textContent = `${totals.sugars} / ${targets.sugarsMax || 50} g`;
    setBarProgress($('micro-sugars-bar'), totals.sugars, targets.sugarsMax || 50, true);

    $('micro-satfat-val').textContent = `${totals.saturatedFat} / ${targets.saturatedFatMax || 22} g`;
    setBarProgress($('micro-satfat-bar'), totals.saturatedFat, targets.saturatedFatMax || 22, true);

    $('micro-sodium-val').textContent = `${totals.sodium} / ${targets.sodiumMax || 2000} mg`;
    setBarProgress($('micro-sodium-bar'), totals.sodium, targets.sodiumMax || 2000, true);

    // Water
    const waterTarget = targets.waterMl || 2200;
    $('water-summary-text').textContent = `${waterMl} / ${waterTarget} ml`;
    setBarProgress($('water-progress-bar'), waterMl, waterTarget);

    // Meals
    const prevDateKey = window.shiftDateKey(uiState.selectedDate, -1);
    const prevDay = storage.getDay(prevDateKey);
    const mealsContainer = $('meals-container');

    mealsContainer.innerHTML = window.MEAL_TYPES.map((m) => {
      const mSum = mealSummaries[m.id] || { kcal: 0, carbs: 0, protein: 0, fat: 0 };
      const entries = (day.meals && day.meals[m.id]) || [];
      const prevHasItems = prevDay.meals && prevDay.meals[m.id] && prevDay.meals[m.id].length > 0;

      const entriesHtml = entries.length === 0
        ? `<div class="meal-empty">
             <span>Nessun alimento registrato · <em>${escapeHtml(m.hint)}</em></span>
           </div>`
        : entries.map((ent) => `
            <div class="entry-row" data-action="edit-entry" data-meal="${m.id}" data-entry-id="${escapeHtml(ent.entryId)}">
              <div class="entry-info">
                <div class="entry-name">${escapeHtml(ent.name)}</div>
                <div class="entry-meta">
                  <strong>${ent.grams} g</strong>
                  ${ent.brand ? ` · ${escapeHtml(ent.brand)}` : ''}
                  · C ${ent.carbs}g · P ${ent.protein}g · G ${ent.fat}g
                </div>
              </div>
              <div class="entry-right">
                <span class="entry-kcal">${ent.kcal} kcal</span>
                <button type="button" class="entry-del-btn" data-action="delete-entry"
                        data-meal="${m.id}" data-entry-id="${escapeHtml(ent.entryId)}"
                        aria-label="Rimuovi alimento" title="Rimuovi">✕</button>
              </div>
            </div>
          `).join('');

      return `
        <div class="meal-card">
          <div class="meal-header">
            <div class="meal-title-wrap">
              <span class="meal-emoji">${m.icon}</span>
              <div>
                <div class="meal-name">${escapeHtml(m.label)}</div>
                <div class="meal-sub-macros">
                  <strong>${mSum.kcal} kcal</strong> · C ${mSum.carbs}g · P ${mSum.protein}g · G ${mSum.fat}g
                </div>
              </div>
            </div>
            <div class="meal-header-actions">
              ${entries.length === 0 && prevHasItems ? `
                <button type="button" class="btn-meal-copy" data-action="copy-yesterday" data-meal="${m.id}" title="Copia gli stessi cibi di ieri">
                  📋 Ieri
                </button>
              ` : ''}
              <button type="button" class="btn-meal-add" data-action="add-to-meal" data-meal="${m.id}">
                + Aggiungi
              </button>
            </div>
          </div>
          <div class="meal-entries">
            ${entriesHtml}
          </div>
        </div>
      `;
    }).join('');

    // Physical Activities
    const acts = day.activities || [];
    const actContainer = $('activities-list');
    if (acts.length === 0) {
      actContainer.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted);">Nessun allenamento registrato oggi. Le calorie bruciate aumentano il tuo budget giornaliero.</div>`;
    } else {
      actContainer.innerHTML = acts.map((a) => `
        <div class="entry-row" style="padding: 9px 4px; cursor: default;">
          <div class="entry-info">
            <div class="entry-name">${escapeHtml(a.name)}</div>
            <div class="entry-meta">${a.minutes} min di attività</div>
          </div>
          <div class="entry-right">
            <span class="entry-kcal" style="color: var(--color-burn);">−${a.kcal} kcal</span>
            <button type="button" class="entry-del-btn" data-action="delete-activity" data-act-id="${escapeHtml(a.id)}" title="Rimuovi">✕</button>
          </div>
        </div>
      `).join('');
    }
  }

  // ==================== TAB 2: ALIMENTI ====================
  function renderCategoryChips() {
    const wrap = $('food-category-chips');
    if (!wrap) return;
    wrap.classList.toggle('hidden', uiState.foodSource !== 'local');

    wrap.innerHTML = (window.FOOD_CATEGORIES || []).map((cat) => `
      <button type="button" class="cat-chip ${uiState.foodCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
        ${cat.icon} ${escapeHtml(cat.label)}
      </button>
    `).join('');
  }

  function getFilteredLocalFoods() {
    const q = normalizeText(uiState.searchQuery.trim());
    let list = [];

    if (uiState.foodSource === 'local') {
      list = storage.getAllLocalFoods();
      if (uiState.foodCategory !== 'all') {
        list = list.filter((f) => f.category === uiState.foodCategory);
      }
    } else if (uiState.foodSource === 'favorites') {
      list = storage.state.favoriteIds
        .map((id) => storage.findFoodById(id))
        .filter(Boolean);
    } else if (uiState.foodSource === 'recent') {
      list = storage.state.recentFoodIds
        .map((id) => storage.findFoodById(id))
        .filter(Boolean);
    } else if (uiState.foodSource === 'custom') {
      list = [...storage.state.customFoods];
    }

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((f) => {
        const hay = normalizeText(`${f.name} ${f.brand || ''}`);
        return tokens.every((tok) => hay.includes(tok));
      });
    }

    return list;
  }

  function triggerOnlineSearch() {
    const q = uiState.searchQuery.trim();
    if (onlineSearchAbort) {
      onlineSearchAbort.abort();
      onlineSearchAbort = null;
    }

    if (q.length < 2) {
      uiState.onlineResults = [];
      uiState.onlineLoading = false;
      uiState.onlineError = '';
      renderFoodsList();
      return;
    }

    uiState.onlineLoading = true;
    uiState.onlineError = '';
    renderFoodsList();

    onlineSearchAbort = new AbortController();
    api.searchOpenFoodFacts(q, onlineSearchAbort.signal)
      .then((items) => {
        uiState.onlineResults = items;
        uiState.onlineLoading = false;
        renderFoodsList();
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        uiState.onlineLoading = false;
        uiState.onlineError = err.message || 'Errore di rete durante la ricerca online.';
        renderFoodsList();
      });
  }

  function renderFoodsList() {
    const container = $('foods-list-container');
    if (!container) return;

    if (uiState.foodSource === 'online') {
      if (uiState.searchQuery.trim().length < 2) {
        container.innerHTML = `
          <div class="card" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            🌐 Digita almeno 2 lettere nella barra di ricerca (es. <strong>Barilla</strong>, <strong>Mulino Bianco</strong>, <strong>Fage</strong>) per cercare nel catalogo prodotti dei supermercati italiani.
          </div>
        `;
        return;
      }
      if (uiState.onlineLoading) {
        container.innerHTML = `
          <div class="card" style="text-align: center; color: var(--text-secondary);">
            ⏳ Ricerca di "<strong>${escapeHtml(uiState.searchQuery)}</strong>" su Open Food Facts Italia...
          </div>
        `;
        return;
      }
      if (uiState.onlineError) {
        container.innerHTML = `
          <div class="card" style="text-align: center; color: var(--color-danger); font-size: 0.85rem;">
            ⚠️ ${escapeHtml(uiState.onlineError)}
          </div>
        `;
        return;
      }
      if (uiState.onlineResults.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            Nessun prodotto trovato online per "${escapeHtml(uiState.searchQuery)}". Prova con un altro nome o crea un alimento personalizzato!
          </div>
        `;
        return;
      }

      container.innerHTML = uiState.onlineResults.map((f) => renderFoodCardHtml(f)).join('');
      return;
    }

    const items = getFilteredLocalFoods();
    let html = items.map((f) => renderFoodCardHtml(f)).join('');

    if (items.length === 0) {
      const emptyHint = uiState.foodSource === 'custom'
        ? 'Non hai ancora creato alimenti personalizzati. Usa il pulsante qui sopra per crearne uno!'
        : uiState.foodSource === 'recent'
          ? 'Gli alimenti che aggiungi al diario appariranno qui per trovarli al volo.'
          : 'Nessun alimento trovato nel database locale.';
      html = `<div class="card" style="text-align: center; color: var(--text-muted); font-size: 0.84rem;">${escapeHtml(emptyHint)}</div>`;
    }

    // Offer 1-tap bridge to search Open Food Facts when user typed a search query
    if (uiState.searchQuery.trim().length >= 2) {
      html += `
        <button type="button" id="btn-bridge-online" class="btn-secondary" style="margin-top: 4px;">
          🌐 Cerca "${escapeHtml(uiState.searchQuery.trim())}" tra le marche del supermercato (Online)
        </button>
      `;
    }

    container.innerHTML = html;
  }

  function renderFoodCardHtml(food) {
    const isFav = storage.isFavorite(food.id);
    // Keep temporary map for online items so clicking resolves immediately
    foodLookupCache.set(food.id, food);

    return `
      <div class="food-item-card" data-food-id="${escapeHtml(food.id)}">
        <div class="food-item-main">
          <div class="food-item-title">
            <span>${escapeHtml(food.name)}</span>
          </div>
          <div class="food-item-sub">
            ${escapeHtml(food.brand || 'Generico')} · Porzione: ${escapeHtml(food.servingName || '100 g')}
          </div>
          <div class="food-item-macros">
            <strong>${Math.round(food.kcal)} kcal/100g</strong>
            <span class="tag-c">C ${food.carbs}g</span>
            <span class="tag-p">P ${food.protein}g</span>
            <span class="tag-f">G ${food.fat}g</span>
          </div>
        </div>
        <div class="food-item-actions">
          ${food.isCustom ? `
            <button type="button" class="entry-del-btn" data-action="del-custom-food" data-food-id="${escapeHtml(food.id)}" title="Elimina dai miei cibi">🗑️</button>
          ` : ''}
          <button type="button" class="fav-star-btn ${isFav ? 'active' : ''}" data-action="toggle-fav" data-food-id="${escapeHtml(food.id)}" title="Preferito">
            ${isFav ? '★' : '☆'}
          </button>
          <button type="button" class="add-plus-btn" data-action="open-add-food" data-food-id="${escapeHtml(food.id)}" title="Scegli quantità e aggiungi">+</button>
        </div>
      </div>
    `;
  }

  const foodLookupCache = new Map();

  function resolveFood(foodId) {
    return foodLookupCache.get(foodId) || storage.findFoodById(foodId);
  }

  function renderFoodsTab() {
    $('foods-target-meal').value = uiState.targetMeal;
    $('food-search-input').value = uiState.searchQuery;
    $('btn-clear-search').style.display = uiState.searchQuery ? 'flex' : 'none';

    document.querySelectorAll('#food-source-tabs .source-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.source === uiState.foodSource);
    });

    renderCategoryChips();
    renderFoodsList();
  }

  // ==================== FOOD PORTION MODAL (ADD & EDIT) ====================
  function openFoodModalForAdd(food, mealOverride) {
    if (!food) return;
    uiState.activeModalFood = food;
    uiState.editingEntry = null;

    const mealId = mealOverride || uiState.targetMeal || guessDefaultMeal();
    $('modal-food-title').textContent = food.name;
    $('modal-food-brand').textContent = `${food.brand || 'Generico'} · ${Math.round(food.kcal)} kcal per 100g`;
    $('modal-food-meal').value = mealId;
    $('modal-food-meal-wrap').classList.remove('hidden');

    const defaultGrams = food.servingGrams || 100;
    $('modal-food-grams').value = defaultGrams;

    $('btn-delete-entry').classList.add('hidden');
    $('btn-confirm-food').textContent = '➕ Aggiungi al Diario';

    updateModalFavButton(food.id);
    renderPortionChips(food, defaultGrams);
    updateNutritionPreview();
    openModal('modal-food');
  }

  function openFoodModalForEdit(dateKey, mealId, entryId) {
    const day = storage.getDay(dateKey);
    const entry = (day.meals?.[mealId] || []).find((e) => e.entryId === entryId);
    if (!entry) return;

    const syntheticFood = resolveFood(entry.foodId) || {
      id: entry.foodId,
      name: entry.name,
      brand: entry.brand,
      servingName: entry.servingName || '100 g',
      servingGrams: entry.servingGrams || 100,
      ...(entry.per100 || {})
    };

    uiState.activeModalFood = syntheticFood;
    uiState.editingEntry = { dateKey, mealId, entryId };

    $('modal-food-title').textContent = entry.name;
    $('modal-food-brand').textContent = `${entry.brand || 'Diario'} · Modifica quantità`;
    $('modal-food-meal').value = mealId;
    $('modal-food-meal-wrap').classList.add('hidden');
    $('modal-food-grams').value = entry.grams;

    $('btn-delete-entry').classList.remove('hidden');
    $('btn-confirm-food').textContent = '💾 Salva Quantità';

    updateModalFavButton(syntheticFood.id);
    renderPortionChips(syntheticFood, entry.grams);
    updateNutritionPreview();
    openModal('modal-food');
  }

  function updateModalFavButton(foodId) {
    const favBtn = $('modal-food-fav');
    if (String(foodId).startsWith('quick_')) {
      favBtn.classList.add('hidden');
      return;
    }
    favBtn.classList.remove('hidden');
    const isFav = storage.isFavorite(foodId);
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.style.color = isFav ? '#fbbf24' : '';
  }

  function renderPortionChips(food, activeGrams) {
    const stdG = Number(food.servingGrams) || 100;
    const stdLabel = food.servingName || `${stdG} g`;
    const presets = [];

    if (stdG !== 100) {
      presets.push({ label: `0.5× (${Math.round(stdG * 0.5)}g)`, grams: Math.round(stdG * 0.5) });
      presets.push({ label: stdLabel, grams: stdG });
      presets.push({ label: `2× (${Math.round(stdG * 2)}g)`, grams: Math.round(stdG * 2) });
    }
    for (const g of [50, 100, 150, 200, 250]) {
      if (!presets.some((p) => p.grams === g)) {
        presets.push({ label: `${g} g`, grams: g });
      }
    }

    $('modal-portion-chips').innerHTML = presets.slice(0, 6).map((p) => `
      <button type="button" class="portion-chip ${Number(activeGrams) === p.grams ? 'active' : ''}" data-grams="${p.grams}">
        ${escapeHtml(p.label)}
      </button>
    `).join('');
  }

  function updateNutritionPreview() {
    const food = uiState.activeModalFood;
    if (!food) return;
    const grams = Math.max(0, Number($('modal-food-grams').value) || 0);
    const scaled = storage.scaleFood(food, grams);

    $('preview-kcal').textContent = scaled.kcal;
    $('preview-carbs').textContent = `${scaled.carbs}g`;
    $('preview-protein').textContent = `${scaled.protein}g`;
    $('preview-fat').textContent = `${scaled.fat}g`;
    $('preview-sugars').textContent = `${scaled.sugars} g`;
    $('preview-satfat').textContent = `${scaled.saturatedFat} g`;
    $('preview-fiber').textContent = `${scaled.fiber} g`;
    $('preview-sodium').textContent = `${scaled.sodium} mg`;

    document.querySelectorAll('#modal-portion-chips .portion-chip').forEach((chip) => {
      chip.classList.toggle('active', Number(chip.dataset.grams) === grams);
    });
  }

  // ==================== TAB 3: STATISTICHE & PESO ====================
  function renderStatsTab() {
    const nDays = uiState.statsDays;
    $('stats-range-7').classList.toggle('active', nDays === 7);
    $('stats-range-14').classList.toggle('active', nDays === 14);

    const todayKey = window.formatDateKey(new Date());
    const endKey = uiState.selectedDate > todayKey ? todayKey : uiState.selectedDate;
    const series = [];

    let activeDaysCount = 0;
    let sumKcal = 0;
    let sumCarbs = 0;
    let sumProtein = 0;
    let sumFat = 0;

    for (let i = nDays - 1; i >= 0; i--) {
      const dKey = window.shiftDateKey(endKey, -i);
      const dt = window.parseDateKey(dKey);
      const daySum = storage.getDaySummary(dKey);
      const shortLabel = nDays <= 7
        ? dt.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3)
        : dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

      series.push({
        dateKey: dKey,
        shortLabel,
        fullLabel: dt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
        kcal: daySum.totals.kcal,
        isToday: dKey === todayKey,
        isSelected: dKey === uiState.selectedDate
      });

      if (daySum.totals.kcal > 0) {
        activeDaysCount++;
        sumKcal += daySum.totals.kcal;
        sumCarbs += daySum.totals.carbs;
        sumProtein += daySum.totals.protein;
        sumFat += daySum.totals.fat;
      }
    }

    const avgKcal = activeDaysCount > 0 ? Math.round(sumKcal / activeDaysCount) : 0;
    const avgProtein = activeDaysCount > 0 ? Math.round(sumProtein / activeDaysCount) : 0;

    $('kpi-avg-kcal').textContent = `${avgKcal} kcal`;
    $('kpi-avg-protein').textContent = `${avgProtein} g`;
    $('kpi-logged-days').textContent = `${activeDaysCount} / ${nDays}`;
    $('kpi-streak').textContent = `🔥 ${storage.getStreakDays()} gg`;

    charts.renderCaloriesBarChart($('chart-weekly-calories'), series, storage.state.targets.kcal);

    charts.renderMacroDonut($('chart-macro-donut'), activeDaysCount > 0 ? {
      carbs: sumCarbs / activeDaysCount,
      protein: sumProtein / activeDaysCount,
      fat: sumFat / activeDaysCount
    } : { carbs: 0, protein: 0, fat: 0 });

    // Weight & BMI
    const prof = storage.state.profile;
    const wLog = storage.state.weightLog || [];
    const currentW = wLog.length > 0 ? wLog[wLog.length - 1].weightKg : prof.weightKg;
    $('weight-input-kg').value = currentW || '';

    const heightM = (Number(prof.heightCm) || 175) / 100;
    const bmi = currentW / (heightM * heightM);
    let bmiCat = 'Normopeso';
    if (bmi < 18.5) bmiCat = 'Sottopeso';
    else if (bmi >= 25 && bmi < 30) bmiCat = 'Sovrappeso';
    else if (bmi >= 30) bmiCat = 'Obesità';
    $('bmi-badge').textContent = `IMC ${bmi.toFixed(1)} · ${bmiCat}`;

    const diff = window.round1(currentW - (prof.targetWeightKg || currentW));
    const diffStr = diff === 0 ? 'Obiettivo raggiunto!' : (diff > 0 ? `−${diff} kg al target` : `+${Math.abs(diff)} kg al target`);

    $('weight-progress-row').innerHTML = `
      <div class="mini-stat-pill"><span>Attuale</span><strong>${currentW} kg</strong></div>
      <div class="mini-stat-pill"><span>Obiettivo</span><strong>${prof.targetWeightKg || '--'} kg</strong></div>
      <div class="mini-stat-pill"><span>Distanza</span><strong style="color: var(--accent-primary);">${diffStr}</strong></div>
    `;

    charts.renderWeightChart($('chart-weight-trend'), wLog, prof.targetWeightKg);
  }

  // ==================== TAB 4: PROFILO & OBIETTIVI ====================
  function initProfileSelects() {
    $('prof-activity').innerHTML = Object.entries(window.ACTIVITY_LEVELS)
      .map(([k, v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`)
      .join('');

    $('prof-goal').innerHTML = Object.entries(window.GOAL_MODES)
      .map(([k, v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`)
      .join('');

    $('prof-preset').innerHTML = Object.entries(window.MACRO_PRESETS)
      .map(([k, v]) => `<option value="${k}">${escapeHtml(v.label)} (${v.carbsPct}% C / ${v.proteinPct}% P / ${v.fatPct}% G)</option>`)
      .join('');
  }

  function populateProfileForm() {
    const p = storage.state.profile;
    const t = storage.state.targets;

    $('prof-sex').value = p.sex || 'M';
    $('prof-age').value = p.age || 30;
    $('prof-height').value = p.heightCm || 175;
    $('prof-weight').value = p.weightKg || 74;
    $('prof-target-weight').value = p.targetWeightKg || 70;
    $('prof-activity').value = p.activityLevel || 'light';
    $('prof-goal').value = p.goalMode || 'maintain';
    $('prof-preset').value = p.macroPreset || 'balanced';
    $('prof-auto-targets').checked = p.useAutoTargets !== false;

    $('target-kcal').value = t.kcal;
    $('target-water').value = t.waterMl;
    $('target-carbs').value = t.carbs;
    $('target-protein').value = t.protein;
    $('target-fat').value = t.fat;
    $('target-fiber').value = t.fiber;

    $('manual-targets-panel').classList.toggle('hidden', $('prof-auto-targets').checked);
    $('profile-gemini-key').value = api.getGeminiApiKey();
    updateTdeeLivePreview();
  }

  function readDraftProfile() {
    return {
      sex: $('prof-sex').value,
      age: Number($('prof-age').value) || 30,
      heightCm: Number($('prof-height').value) || 175,
      weightKg: Number($('prof-weight').value) || 74,
      targetWeightKg: Number($('prof-target-weight').value) || 70,
      activityLevel: $('prof-activity').value,
      goalMode: $('prof-goal').value,
      macroPreset: $('prof-preset').value,
      useAutoTargets: $('prof-auto-targets').checked
    };
  }

  function updateTdeeLivePreview() {
    const draft = readDraftProfile();
    const calc = window.computeTargetsFromProfile(draft);
    $('tdee-preview-box').innerHTML = `
      <div style="font-weight: 700; color: var(--accent-primary);">Stima Metabolica (Formula Mifflin-St Jeor):</div>
      <div class="tdee-preview-grid">
        <div><div style="color: var(--text-muted); font-size: 0.7rem;">BMR Basale</div><strong>${calc.bmr} kcal</strong></div>
        <div><div style="color: var(--text-muted); font-size: 0.7rem;">Consumo TDEE</div><strong>${calc.tdee} kcal</strong></div>
        <div><div style="color: var(--text-muted); font-size: 0.7rem;">Target Consigliato</div><strong style="color: var(--accent-primary);">${calc.kcal} kcal</strong></div>
      </div>
      <div style="margin-top: 8px; text-align: center; font-size: 0.75rem; color: var(--text-secondary);">
        Macro consigliati: <strong>C ${calc.carbs}g</strong> · <strong>P ${calc.protein}g</strong> · <strong>G ${calc.fat}g</strong> · Acqua <strong>${calc.waterMl} ml</strong>
      </div>
    `;
  }

  // ==================== AI MEAL PHOTO RECOGNITION ====================
  function syncAiKeyUi(forceEdit = false) {
    const hasKey = Boolean(api.getGeminiApiKey());
    const showSetup = forceEdit || !hasKey;
    $('ai-key-setup-box').classList.toggle('hidden', !showSetup);
    $('ai-key-active-pill').classList.toggle('hidden', showSetup);
    if (showSetup) {
      $('ai-api-key-input').value = api.getGeminiApiKey();
    }
  }

  function openAiMealModal(mealOverride) {
    const mealId = mealOverride || uiState.targetMeal || guessDefaultMeal();
    $('ai-target-meal').value = mealId;
    syncAiKeyUi(false);
    openModal('modal-ai-meal');
  }

  async function handleAiPhotoFile(file) {
    if (!file) return;
    const statusEl = $('ai-status-msg');
    statusEl.classList.remove('hidden');
    statusEl.style.color = 'var(--text-secondary)';
    statusEl.textContent = '📸 Ottimizzazione foto in corso...';

    try {
      const compressed = await api.compressImageForAi(file);
      uiState.aiImage = compressed;
      $('ai-photo-preview-img').src = compressed.previewDataUrl;
      $('ai-photo-preview-wrap').classList.remove('hidden');
      $('ai-results-box').classList.add('hidden');
      statusEl.classList.add('hidden');
    } catch (err) {
      statusEl.style.color = 'var(--color-danger)';
      statusEl.textContent = `⚠️ ${err.message}`;
    }
  }

  function renderAiResults() {
    const res = uiState.aiResult;
    if (!res) {
      $('ai-results-box').classList.add('hidden');
      return;
    }

    $('ai-results-box').classList.remove('hidden');
    $('ai-dish-title').textContent = `🍽️ ${res.dishName}`;
    $('ai-confidence-badge').textContent = `Confidenza ${res.confidence}`;
    $('ai-dish-notes').textContent = res.notes || '';

    const listEl = $('ai-ingredients-list');
    listEl.innerHTML = res.items.map((it, idx) => {
      const scaled = storage.scaleFood(it.food, it.grams);
      return `
        <div class="ai-ing-row" data-ai-idx="${idx}">
          <label class="ai-ing-left">
            <input type="checkbox" class="ai-ing-check" data-ai-idx="${idx}" ${it.checked ? 'checked' : ''} />
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(it.name)}</div>
              <div class="ai-ing-macros" data-ai-macros="${idx}" style="font-size: 0.73rem; color: var(--text-muted);">
                <strong>${scaled.kcal} kcal</strong> · C ${scaled.carbs}g · P ${scaled.protein}g · G ${scaled.fat}g
              </div>
            </div>
          </label>
          <div class="ai-ing-grams-wrap">
            <input type="number" class="ai-ing-grams-input" data-ai-idx="${idx}"
                   value="${it.grams}" min="1" max="3000" step="1" inputmode="decimal" aria-label="Grammi" />
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">g</span>
          </div>
        </div>
      `;
    }).join('');

    updateAiTotalsBanner();
  }

  function updateAiTotalsBanner() {
    const res = uiState.aiResult;
    if (!res) return;

    let totKcal = 0, totC = 0, totP = 0, totF = 0, count = 0;
    res.items.forEach((it, idx) => {
      const scaled = storage.scaleFood(it.food, it.grams);
      const macroLine = document.querySelector(`[data-ai-macros="${idx}"]`);
      if (macroLine) {
        macroLine.innerHTML = `<strong>${scaled.kcal} kcal</strong> · C ${scaled.carbs}g · P ${scaled.protein}g · G ${scaled.fat}g`;
      }
      if (it.checked) {
        count++;
        totKcal += scaled.kcal;
        totC += scaled.carbs;
        totP += scaled.protein;
        totF += scaled.fat;
      }
    });

    $('ai-total-summary').innerHTML = `
      <div><strong>Totale selezionato (${count}):</strong> <span style="color: var(--accent-primary); font-weight: 800;">${Math.round(totKcal)} kcal</span></div>
      <div style="font-size: 0.75rem; font-weight: 700;">
        <span class="tag-c">C ${window.round1(totC)}g</span> ·
        <span class="tag-p">P ${window.round1(totP)}g</span> ·
        <span class="tag-f">G ${window.round1(totF)}g</span>
      </div>
    `;
  }

  // ==================== GEMINI CHAT AUTO-IMPORT CONTROLLER ====================
  function applyImportBatch(batch) {
    if (!batch) return;
    const targetDate = batch.dateKey || uiState.selectedDate;
    let addedMeals = 0;

    for (const item of batch.meals || []) {
      if (item.checked !== false && item.grams > 0) {
        storage.addFoodEntry(targetDate, item.mealId || guessDefaultMeal(), item.food, item.grams);
        addedMeals++;
      }
    }

    if (batch.waterMl > 0) {
      storage.addWater(targetDate, batch.waterMl);
    }

    let addedActs = 0;
    for (const act of batch.activities || []) {
      storage.addActivity(targetDate, act.name, act.minutes, act.kcal);
      addedActs++;
    }

    if (batch.weightKg) {
      storage.logWeight(targetDate, batch.weightKg);
    }

    uiState.selectedDate = targetDate;
    closeModal('modal-gemini-chat');
    switchTab('diary');

    const summaryParts = [];
    if (addedMeals > 0) summaryParts.push(`${addedMeals} aliment${addedMeals === 1 ? 'o' : 'i'}`);
    if (batch.waterMl > 0) summaryParts.push(`+${batch.waterMl}ml acqua`);
    if (addedActs > 0) summaryParts.push(`${addedActs} sport`);
    if (batch.weightKg) summaryParts.push(`peso ${batch.weightKg}kg`);

    showToast(`✅ Inseriti in automatico: ${summaryParts.join(', ')}!`);
  }

  function renderGchatPreview(batch) {
    uiState.pendingChatBatch = batch;
    const box = $('gchat-preview-box');
    const list = $('gchat-preview-list');
    box.classList.remove('hidden');

    const mealNames = { colazione: '☀️ Colazione', pranzo: '🍝 Pranzo', cena: '🌙 Cena', spuntini: '🍎 Spuntini' };
    let rowsHtml = (batch.meals || []).map((m, idx) => {
      const scaled = storage.scaleFood(m.food, m.grams);
      return `
        <div class="ai-ing-row">
          <label class="ai-ing-left">
            <input type="checkbox" class="gchat-item-check" data-gidx="${idx}" checked />
            <div>
              <div style="font-weight: 700; font-size: 0.84rem;">
                <span style="color: var(--color-carbs);">${mealNames[m.mealId] || m.mealId}:</span> ${escapeHtml(m.food.name)}
              </div>
              <div style="font-size: 0.73rem; color: var(--text-muted);">
                ${m.grams}g · <strong>${scaled.kcal} kcal</strong> · C ${scaled.carbs}g · P ${scaled.protein}g · G ${scaled.fat}g
              </div>
            </div>
          </label>
        </div>
      `;
    }).join('');

    if (batch.waterMl > 0) {
      rowsHtml += `<div class="ai-ing-row"><div style="font-size: 0.83rem;">💧 Acqua: <strong>+${batch.waterMl} ml</strong></div></div>`;
    }
    for (const a of batch.activities || []) {
      rowsHtml += `<div class="ai-ing-row"><div style="font-size: 0.83rem;">🏃 ${escapeHtml(a.name)}: <strong>${a.minutes} min (−${a.kcal} kcal)</strong></div></div>`;
    }
    if (batch.weightKg) {
      rowsHtml += `<div class="ai-ing-row"><div style="font-size: 0.83rem;">⚖️ Peso registrato: <strong>${batch.weightKg} kg</strong></div></div>`;
    }

    list.innerHTML = rowsHtml;
  }

  async function processGeminiChatInput(rawText, forceAutoInsert = null) {
    const statusEl = $('gchat-status-msg');
    const runBtn = $('btn-run-gchat-import');
    statusEl.classList.remove('hidden');
    statusEl.style.color = 'var(--color-carbs)';
    statusEl.textContent = '⏳ Lettura della chat Gemini ed estrazione automatica in corso...';
    $('gchat-preview-box').classList.add('hidden');
    runBtn.disabled = true;

    try {
      const batch = await api.importFromGeminiChat(rawText, guessDefaultMeal());
      statusEl.classList.add('hidden');
      const shouldAuto = forceAutoInsert !== null ? forceAutoInsert : $('gchat-auto-insert').checked;
      if (shouldAuto) {
        $('gchat-input').value = '';
        applyImportBatch(batch);
      } else {
        renderGchatPreview(batch);
      }
    } catch (err) {
      statusEl.style.color = 'var(--color-danger)';
      statusEl.textContent = `⚠️ ${err.message}`;
    } finally {
      runBtn.disabled = false;
    }
  }

  // ==================== BARCODE SCANNER ====================
  async function handleDetectedBarcode(code) {
    $('scanner-status').textContent = `🔎 Ricerca prodotto con codice ${code}...`;
    try {
      const food = await api.lookupBarcode(code);
      foodLookupCache.set(food.id, food);
      closeModal('modal-scanner');
      openFoodModalForAdd(food);
      showToast(`Trovato: ${food.name}`);
    } catch (err) {
      $('scanner-status').textContent = `⚠️ ${err.message}`;
    }
  }

  function openScannerModal() {
    $('manual-barcode-input').value = '';
    $('scanner-status').textContent = 'Avvio fotocamera... oppure usa "Scatta Foto al Codice a Barre".';
    openModal('modal-scanner');

    barcodeScanner.start(
      $('scanner-video'),
      (code) => handleDetectedBarcode(code),
      (errMsg) => {
        $('scanner-status').textContent = errMsg;
      }
    );
  }

  // ==================== CLIENT-SIDE QR SVG GENERATOR (V1..V4, LEVEL L) ====================
  function generateQrSvgClient(text) {
    try {
      const specs = {
        1: [21, 19, 7, []],
        2: [25, 34, 10, [6, 18]],
        3: [29, 55, 15, [6, 22]],
        4: [33, 80, 20, [6, 26]]
      };
      const payload = Array.from(new TextEncoder().encode(text));
      let ver = null;
      for (const v of [1, 2, 3, 4]) {
        if (payload.length + 2 <= specs[v][1]) { ver = v; break; }
      }
      if (!ver) return '';
      const [size, dataCw, ecCw, aligns] = specs[ver];

      const gfExp = new Array(512).fill(0);
      const gfLog = new Array(256).fill(0);
      let x = 1;
      for (let i = 0; i < 255; i++) {
        gfExp[i] = x; gfLog[x] = i;
        x <<= 1; if (x & 0x100) x ^= 0x11d;
      }
      for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255];
      const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]]);

      let gen = [1];
      for (let i = 0; i < ecCw; i++) {
        const nxt = new Array(gen.length + 1).fill(0);
        for (let j = 0; j < gen.length; j++) {
          nxt[j] ^= gen[j];
          nxt[j + 1] ^= gfMul(gen[j], gfExp[i]);
        }
        gen = nxt;
      }

      const bits = [0, 1, 0, 0];
      for (let i = 7; i >= 0; i--) bits.push((payload.length >> i) & 1);
      for (const b of payload) {
        for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
      }
      const maxBits = dataCw * 8;
      for (let k = 0; k < Math.min(4, maxBits - bits.length); k++) bits.push(0);
      while (bits.length % 8 !== 0) bits.push(0);

      const codewords = [];
      for (let i = 0; i < bits.length; i += 8) {
        let val = 0;
        for (let j = 0; j < 8; j++) val = (val << 1) | bits[i + j];
        codewords.push(val);
      }
      const pads = [0xec, 0x11];
      let pIdx = 0;
      while (codewords.length < dataCw) codewords.push(pads[pIdx++ % 2]);

      const rem = new Array(ecCw).fill(0);
      for (const b of codewords) {
        const factor = b ^ rem[0];
        rem.shift(); rem.push(0);
        for (let j = 0; j < ecCw; j++) rem[j] ^= gfMul(gen[j + 1], factor);
      }
      const fullCw = codewords.concat(rem);

      const mat = Array.from({ length: size }, () => new Array(size).fill(0));
      const isFunc = Array.from({ length: size }, () => new Array(size).fill(false));
      const setF = (r, c, d) => {
        if (r >= 0 && r < size && c >= 0 && c < size) { mat[r][c] = d ? 1 : 0; isFunc[r][c] = true; }
      };
      const finder = (tr, lc) => {
        for (let dr = -1; dr <= 7; dr++) {
          for (let dc = -1; dc <= 7; dc++) {
            const inOut = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
            const bord = dr === 0 || dr === 6 || dc === 0 || dc === 6;
            const cent = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
            setF(tr + dr, lc + dc, inOut && (bord || cent));
          }
        }
      };
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
      for (const ar of aligns) {
        for (const ac of aligns) {
          if ((ar === 6 && ac === 6) || (ar === 6 && ac === size - 7) || (ar === size - 7 && ac === 6)) continue;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const m = Math.max(Math.abs(dr), Math.abs(dc));
              setF(ar + dr, ac + dc, m === 0 || m === 2);
            }
          }
        }
      }
      for (let i = 8; i < size - 8; i++) {
        if (!isFunc[6][i]) setF(6, i, i % 2 === 0);
        if (!isFunc[i][6]) setF(i, 6, i % 2 === 0);
      }
      setF(size - 8, 8, true);
      for (let i = 0; i < 9; i++) {
        if (!isFunc[8][i]) setF(8, i, false);
        if (!isFunc[i][8]) setF(i, 8, false);
      }
      for (let i = 0; i < 8; i++) if (!isFunc[8][size - 1 - i]) setF(8, size - 1 - i, false);
      for (let i = 0; i < 7; i++) if (!isFunc[size - 1 - i][8]) setF(size - 1 - i, 8, false);

      const allBits = [];
      for (const cw of fullCw) for (let i = 7; i >= 0; i--) allBits.push((cw >> i) & 1);
      let bIdx = 0; let up = true;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (let step = 0; step < size; step++) {
          const r = up ? size - 1 - step : step;
          for (const dc of [0, -1]) {
            const c = col + dc;
            if (!isFunc[r][c]) {
              let bit = bIdx < allBits.length ? allBits[bIdx++] : 0;
              if ((r + c) % 2 === 0) bit ^= 1;
              mat[r][c] = bit;
            }
          }
        }
        up = !up;
      }

      // Format bits for Level L (01) + Mask 0 (000) => 0x77c4
      const fmt = 0x77c4;
      const tl = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
      const trbl = [
        [size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],
        [8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]
      ];
      for (let i = 0; i < 15; i++) {
        const bit = (fmt >> (14 - i)) & 1;
        mat[tl[i][0]][tl[i][1]] = bit;
        mat[trbl[i][0]][trbl[i][1]] = bit;
      }

      const border = 3;
      const tot = size + border * 2;
      let path = '';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (mat[r][c]) path += `M${c + border},${r + border}h1v1h-1z`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tot} ${tot}" shape-rendering="crispEdges"><rect width="${tot}" height="${tot}" fill="#ffffff"/><path fill="#0f172a" d="${path}"/></svg>`;
    } catch (err) {
      return '';
    }
  }

  // ==================== INSTALL / WI-FI & ONLINE QR MODAL ====================
  async function openInstallModal() {
    openModal('modal-install');
    const qrBox = $('wifi-qr-box');
    const hintEl = $('install-qr-hint');
    const isOnlineHttps = window.location.protocol === 'https:';

    if (isOnlineHttps) {
      const publicUrl = window.location.href.split('?')[0];
      if (hintEl) {
        hintEl.innerHTML = '🌐 <strong>NutriTrack è online!</strong> Inquadra il QR Code dal telefono per aprirla ovunque (4G/5G o Wi-Fi):';
      }
      const svg = generateQrSvgClient(publicUrl);
      qrBox.innerHTML = `
        ${svg}
        <div style="margin-top: 8px; font-weight: 800; font-size: 0.9rem; word-break: break-all;">
          ${escapeHtml(publicUrl)}
        </div>
        <button type="button" id="btn-copy-app-url" style="margin-top: 8px; padding: 6px 14px; border-radius: 8px; background: #059669; color: #fff; font-weight: 700; font-size: 0.78rem;">
          📋 Copia Link Online
        </button>
      `;
      const copyBtn = $('btn-copy-app-url');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(publicUrl).then(() => showToast('📋 Link copiato negli appunti!'));
        });
      }
      return;
    }

    try {
      const res = await fetch('/api/server-info', { cache: 'no-store' });
      if (!res.ok) throw new Error('Non in esecuzione tramite server locale');
      const info = await res.json();
      if (hintEl) {
        hintEl.innerHTML = 'Assicurati che il telefono sia sulla <strong>stessa rete Wi-Fi</strong> del PC e inquadra il QR Code:';
      }
      qrBox.innerHTML = `
        ${info.qrSvg || ''}
        <div style="margin-top: 8px; font-weight: 800; font-size: 0.95rem; word-break: break-all;">
          ${escapeHtml(info.lanUrl)}
        </div>
        <div style="font-size: 0.74rem; color: #64748b; margin-top: 3px;">
          Inquadra con la fotocamera del telefono (stesso Wi-Fi)
        </div>
      `;
    } catch (e) {
      const currentUrl = window.location.href.split('?')[0];
      const svg = generateQrSvgClient(currentUrl);
      qrBox.innerHTML = `
        ${svg}
        <div style="font-weight: 700; font-size: 0.86rem; padding: 6px;">
          <strong style="color: #059669; word-break: break-all;">${escapeHtml(currentUrl)}</strong>
        </div>
      `;
    }
  }

  // ==================== EVENT LISTENERS ====================
  function bindEvents() {
    // Bottom nav
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    $('btn-fab-add').addEventListener('click', () => {
      uiState.targetMeal = guessDefaultMeal();
      switchTab('foods');
      setTimeout(() => $('food-search-input').focus(), 80);
    });

    // Theme toggle
    $('btn-toggle-theme').addEventListener('click', () => {
      const next = storage.state.profile.theme === 'light' ? 'dark' : 'light';
      storage.state.profile.theme = next;
      storage.save();
      applyTheme(next);
    });

    // Install modal triggers
    $('btn-open-install').addEventListener('click', openInstallModal);
    $('btn-profile-install').addEventListener('click', openInstallModal);

    // Date bar
    $('btn-prev-day').addEventListener('click', () => setDate(window.shiftDateKey(uiState.selectedDate, -1)));
    $('btn-next-day').addEventListener('click', () => setDate(window.shiftDateKey(uiState.selectedDate, 1)));
    $('btn-today-jump').addEventListener('click', () => setDate(window.formatDateKey(new Date())));
    $('date-picker-input').addEventListener('change', (e) => {
      if (e.target.value) setDate(e.target.value);
    });

    // Micros accordion
    $('btn-toggle-micros').addEventListener('click', () => {
      const open = $('micros-panel').classList.toggle('open');
      $('micros-chevron').textContent = open ? '▴' : '▾';
    });

    // Diary quick strip
    $('btn-diary-ai').addEventListener('click', () => openAiMealModal(guessDefaultMeal()));
    $('btn-diary-search').addEventListener('click', () => {
      uiState.targetMeal = guessDefaultMeal();
      switchTab('foods');
      setTimeout(() => $('food-search-input').focus(), 80);
    });
    $('btn-diary-scan').addEventListener('click', openScannerModal);
    $('btn-diary-quick').addEventListener('click', () => {
      $('quick-meal').value = guessDefaultMeal();
      $('form-quick-add').reset();
      $('quick-meal').value = guessDefaultMeal();
      openModal('modal-quick');
    });

    // Gemini Chat Sync Modal
    $('btn-open-gchat').addEventListener('click', () => {
      $('gchat-status-msg').classList.add('hidden');
      $('gchat-preview-box').classList.add('hidden');
      openModal('modal-gemini-chat');
    });

    $('btn-paste-and-import').addEventListener('click', async () => {
      try {
        const clipText = await navigator.clipboard.readText();
        if (!clipText || !clipText.trim()) {
          showToast('Gli appunti sono vuoti! Copia prima il messaggio da Gemini.');
          return;
        }
        $('gchat-input').value = clipText;
        await processGeminiChatInput(clipText, $('gchat-auto-insert').checked);
      } catch (err) {
        $('gchat-input').focus();
        showToast('Incolla il testo tenendo premuto nel riquadro qui sotto!');
      }
    });

    $('btn-run-gchat-import').addEventListener('click', () => {
      processGeminiChatInput($('gchat-input').value);
    });

    $('gchat-preview-list').addEventListener('change', (e) => {
      if (!uiState.pendingChatBatch) return;
      if (e.target.classList.contains('gchat-item-check')) {
        const idx = Number(e.target.dataset.gidx);
        if (uiState.pendingChatBatch.meals[idx]) {
          uiState.pendingChatBatch.meals[idx].checked = e.target.checked;
        }
      }
    });

    $('btn-confirm-gchat-preview').addEventListener('click', () => {
      if (uiState.pendingChatBatch) {
        $('gchat-input').value = '';
        applyImportBatch(uiState.pendingChatBatch);
        uiState.pendingChatBatch = null;
      }
    });

    $('btn-copy-gemini-prompt').addEventListener('click', async () => {
      const appUrl = window.location.protocol === 'https:'
        ? window.location.href.split('?')[0]
        : 'https://valentinv05.github.io/nutritrack/';
      const promptText = api.buildGeminiCompanionPrompt(appUrl);
      try {
        await navigator.clipboard.writeText(promptText);
        showToast('📋 Istruzione copiata! Incollala nella tua chat di Gemini.');
      } catch (err) {
        $('gchat-input').value = promptText;
        $('gchat-input').select();
        showToast('Copia il testo selezionato e invialo a Gemini!');
      }
    });

    // Water buttons
    $('btn-water-minus').addEventListener('click', () => {
      storage.addWater(uiState.selectedDate, -200);
      renderDiary();
    });
    $('btn-water-200').addEventListener('click', () => {
      storage.addWater(uiState.selectedDate, 200);
      renderDiary();
      showToast('💧 +200 ml di acqua registrati');
    });
    $('btn-water-500').addEventListener('click', () => {
      storage.addWater(uiState.selectedDate, 500);
      renderDiary();
      showToast('💧 +500 ml di acqua registrati');
    });

    // Delegated clicks inside Meals Container
    $('meals-container').addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete-entry"]');
      if (delBtn) {
        e.stopPropagation();
        storage.removeFoodEntry(uiState.selectedDate, delBtn.dataset.meal, delBtn.dataset.entryId);
        renderDiary();
        showToast('Alimento rimosso dal diario');
        return;
      }

      const addBtn = e.target.closest('[data-action="add-to-meal"]');
      if (addBtn) {
        uiState.targetMeal = addBtn.dataset.meal;
        switchTab('foods');
        setTimeout(() => $('food-search-input').focus(), 80);
        return;
      }

      const copyBtn = e.target.closest('[data-action="copy-yesterday"]');
      if (copyBtn) {
        const prevKey = window.shiftDateKey(uiState.selectedDate, -1);
        const count = storage.copyMealFromDate(prevKey, uiState.selectedDate, copyBtn.dataset.meal);
        renderDiary();
        showToast(`📋 Copiati ${count} alimenti da ieri`);
        return;
      }

      const editRow = e.target.closest('[data-action="edit-entry"]');
      if (editRow) {
        openFoodModalForEdit(uiState.selectedDate, editRow.dataset.meal, editRow.dataset.entryId);
      }
    });

    // Activities
    $('btn-add-activity').addEventListener('click', () => {
      updateActivityEstimatedKcal();
      openModal('modal-activity');
    });

    $('activities-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete-activity"]');
      if (btn) {
        storage.removeActivity(uiState.selectedDate, btn.dataset.actId);
        renderDiary();
        showToast('Allenamento rimosso');
      }
    });

    $('activity-presets').addEventListener('click', (e) => {
      const chip = e.target.closest('.portion-chip');
      if (!chip) return;
      $('act-name').value = chip.dataset.act;
      uiState.activeMet = Number(chip.dataset.met) || 5;
      updateActivityEstimatedKcal();
    });

    $('act-minutes').addEventListener('input', updateActivityEstimatedKcal);

    $('form-activity').addEventListener('submit', (e) => {
      e.preventDefault();
      storage.addActivity(
        uiState.selectedDate,
        $('act-name').value.trim(),
        Number($('act-minutes').value),
        Number($('act-kcal').value)
      );
      closeModal('modal-activity');
      renderDiary();
      showToast('🔥 Allenamento registrato!');
    });

    // Foods Tab interactions
    $('foods-target-meal').addEventListener('change', (e) => {
      uiState.targetMeal = e.target.value;
    });

    $('food-search-input').addEventListener('input', (e) => {
      uiState.searchQuery = e.target.value;
      $('btn-clear-search').style.display = uiState.searchQuery ? 'flex' : 'none';

      if (uiState.foodSource === 'online') {
        clearTimeout(onlineDebounceTimer);
        onlineDebounceTimer = setTimeout(triggerOnlineSearch, 420);
      } else {
        renderFoodsList();
      }
    });

    $('btn-clear-search').addEventListener('click', () => {
      uiState.searchQuery = '';
      $('food-search-input').value = '';
      $('btn-clear-search').style.display = 'none';
      if (uiState.foodSource === 'online') {
        uiState.onlineResults = [];
      }
      renderFoodsList();
      $('food-search-input').focus();
    });

    $('btn-foods-scan').addEventListener('click', openScannerModal);

    $('food-source-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.source-tab');
      if (!tab) return;
      uiState.foodSource = tab.dataset.source;
      renderFoodsTab();
      if (uiState.foodSource === 'online' && uiState.searchQuery.trim().length >= 2) {
        triggerOnlineSearch();
      }
    });

    $('food-category-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.cat-chip');
      if (!chip) return;
      uiState.foodCategory = chip.dataset.cat;
      renderCategoryChips();
      renderFoodsList();
    });

    $('btn-foods-ai').addEventListener('click', () => openAiMealModal(uiState.targetMeal));

    $('btn-new-custom-food').addEventListener('click', () => {
      $('form-custom-food').reset();
      $('cf-serving-grams').value = 100;
      openModal('modal-custom-food');
    });

    $('foods-list-container').addEventListener('click', (e) => {
      if (e.target.id === 'btn-bridge-online') {
        uiState.foodSource = 'online';
        renderFoodsTab();
        triggerOnlineSearch();
        return;
      }

      const favBtn = e.target.closest('[data-action="toggle-fav"]');
      if (favBtn) {
        e.stopPropagation();
        const food = resolveFood(favBtn.dataset.foodId);
        if (food) {
          const added = storage.toggleFavorite(food);
          renderFoodsList();
          showToast(added ? '⭐ Aggiunto ai preferiti' : 'Rimosso dai preferiti');
        }
        return;
      }

      const delCustom = e.target.closest('[data-action="del-custom-food"]');
      if (delCustom) {
        e.stopPropagation();
        if (confirm('Vuoi eliminare questo alimento personalizzato?')) {
          storage.deleteCustomFood(delCustom.dataset.foodId);
          renderFoodsList();
          showToast('Alimento personalizzato eliminato');
        }
        return;
      }

      const card = e.target.closest('.food-item-card');
      if (card) {
        const food = resolveFood(card.dataset.foodId);
        if (food) openFoodModalForAdd(food);
      }
    });

    // Food Portion Modal
    $('btn-grams-minus').addEventListener('click', () => {
      const cur = Number($('modal-food-grams').value) || 0;
      $('modal-food-grams').value = Math.max(5, cur - 10);
      updateNutritionPreview();
    });
    $('btn-grams-plus').addEventListener('click', () => {
      const cur = Number($('modal-food-grams').value) || 0;
      $('modal-food-grams').value = cur + 10;
      updateNutritionPreview();
    });
    $('modal-food-grams').addEventListener('input', updateNutritionPreview);

    $('modal-portion-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.portion-chip');
      if (!chip) return;
      $('modal-food-grams').value = chip.dataset.grams;
      updateNutritionPreview();
    });

    $('modal-food-fav').addEventListener('click', () => {
      if (!uiState.activeModalFood) return;
      storage.toggleFavorite(uiState.activeModalFood);
      updateModalFavButton(uiState.activeModalFood.id);
      if (uiState.activeTab === 'foods') renderFoodsList();
    });

    $('btn-delete-entry').addEventListener('click', () => {
      if (!uiState.editingEntry) return;
      const { dateKey, mealId, entryId } = uiState.editingEntry;
      storage.removeFoodEntry(dateKey, mealId, entryId);
      closeModal('modal-food');
      renderDiary();
      showToast('Alimento eliminato');
    });

    $('form-modal-food').addEventListener('submit', (e) => {
      e.preventDefault();
      const grams = Math.max(1, Number($('modal-food-grams').value) || 100);

      if (uiState.editingEntry) {
        const { dateKey, mealId, entryId } = uiState.editingEntry;
        storage.updateFoodEntryGrams(dateKey, mealId, entryId, grams);
        closeModal('modal-food');
        renderDiary();
        showToast('✅ Quantità aggiornata!');
      } else if (uiState.activeModalFood) {
        const mealId = $('modal-food-meal').value || uiState.targetMeal;
        uiState.targetMeal = mealId;
        storage.addFoodEntry(uiState.selectedDate, mealId, uiState.activeModalFood, grams);
        closeModal('modal-food');
        renderHeaderAndDate();
        if (uiState.activeTab === 'diary') renderDiary();
        showToast(`✅ Aggiunto a ${ mealId.charAt(0).toUpperCase() + mealId.slice(1) }!`);
      }
    });

    // Quick Add Modal
    $('form-quick-add').addEventListener('submit', (e) => {
      e.preventDefault();
      const mealId = $('quick-meal').value;
      const kcal = Math.max(1, Number($('quick-kcal').value) || 0);
      const name = $('quick-name').value.trim() || 'Calorie rapide';
      const carbs = Math.max(0, Number($('quick-carbs').value) || 0);
      const protein = Math.max(0, Number($('quick-protein').value) || 0);
      const fat = Math.max(0, Number($('quick-fat').value) || 0);

      const quickFood = {
        id: 'quick_' + Date.now(),
        name,
        brand: 'Inserimento rapido',
        servingName: '1 porzione',
        servingGrams: 100,
        kcal,
        carbs,
        protein,
        fat,
        sugars: 0,
        saturatedFat: 0,
        fiber: 0,
        sodium: 0
      };

      storage.addFoodEntry(uiState.selectedDate, mealId, quickFood, 100);
      closeModal('modal-quick');
      renderDiary();
      showToast(`⚡ +${kcal} kcal aggiunte!`);
    });

    // Custom Food Modal
    $('form-custom-food').addEventListener('submit', (e) => {
      e.preventDefault();
      const servingG = Math.max(1, Number($('cf-serving-grams').value) || 100);
      const created = storage.addCustomFood({
        name: $('cf-name').value,
        brand: $('cf-brand').value || 'Mio alimento',
        servingGrams: servingG,
        servingName: `1 porzione (${servingG} g)`,
        kcal: $('cf-kcal').value,
        protein: $('cf-protein').value,
        carbs: $('cf-carbs').value,
        sugars: $('cf-sugars').value,
        fat: $('cf-fat').value,
        saturatedFat: $('cf-satfat').value,
        fiber: $('cf-fiber').value,
        sodium: $('cf-sodium').value
      });
      closeModal('modal-custom-food');
      uiState.foodSource = 'custom';
      renderFoodsTab();
      openFoodModalForAdd(created);
      showToast('✨ Alimento salvato nei Miei Cibi!');
    });

    // Scanner Photo & Manual Code
    $('scanner-photo-input').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      $('scanner-status').textContent = '🔍 Lettura codice a barre dalla foto...';
      try {
        const code = await api.detectBarcodeFromImageFile(file);
        if (code) {
          await handleDetectedBarcode(code);
        } else {
          $('scanner-status').textContent = '⚠️ Codice non leggibile nella foto. Avvicinati alle barre ben illuminate oppure digita le cifre qui sotto.';
        }
      } catch (err) {
        $('scanner-status').textContent = '⚠️ Impossibile elaborare la foto. Inserisci il codice manualmente qui sotto.';
      } finally {
        e.target.value = '';
      }
    });

    $('form-manual-barcode').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = $('manual-barcode-input').value.trim();
      if (raw) handleDetectedBarcode(raw);
    });

    // Stats & Weight
    $('stats-range-7').addEventListener('click', () => {
      uiState.statsDays = 7;
      renderStatsTab();
    });
    $('stats-range-14').addEventListener('click', () => {
      uiState.statsDays = 14;
      renderStatsTab();
    });

    $('form-log-weight').addEventListener('submit', (e) => {
      e.preventDefault();
      const w = Number($('weight-input-kg').value);
      if (storage.logWeight(uiState.selectedDate, w)) {
        renderStatsTab();
        showToast(`⚖️ Peso registrato: ${w} kg`);
      } else {
        showToast('Inserisci un peso valido (25 - 350 kg)');
      }
    });

    // Profile & Targets
    ['prof-sex', 'prof-age', 'prof-height', 'prof-weight', 'prof-activity', 'prof-goal', 'prof-preset'].forEach((id) => {
      $(id).addEventListener('input', updateTdeeLivePreview);
      $(id).addEventListener('change', updateTdeeLivePreview);
    });

    $('prof-auto-targets').addEventListener('change', (e) => {
      $('manual-targets-panel').classList.toggle('hidden', e.target.checked);
    });

    $('form-profile').addEventListener('submit', (e) => {
      e.preventDefault();
      const draft = readDraftProfile();
      const manual = draft.useAutoTargets ? null : {
        kcal: $('target-kcal').value,
        waterMl: $('target-water').value,
        carbs: $('target-carbs').value,
        protein: $('target-protein').value,
        fat: $('target-fat').value,
        fiber: $('target-fiber').value
      };

      storage.updateProfileAndTargets(draft, manual);
      populateProfileForm();
      showToast('🎯 Obiettivi aggiornati con successo!');
    });

    // AI Meal Recognition Events
    $('btn-save-ai-key').addEventListener('click', () => {
      const k = $('ai-api-key-input').value.trim();
      api.setGeminiApiKey(k);
      $('profile-gemini-key').value = k;
      syncAiKeyUi(false);
      showToast(k ? '🔑 Chiave Gemini AI salvata!' : 'Chiave AI rimossa');
    });

    $('btn-change-ai-key').addEventListener('click', () => {
      syncAiKeyUi(true);
      $('ai-api-key-input').focus();
    });

    $('btn-save-profile-ai-key').addEventListener('click', () => {
      const k = $('profile-gemini-key').value.trim();
      api.setGeminiApiKey(k);
      showToast(k ? '🔑 Chiave Gemini AI salvata!' : 'Chiave AI rimossa');
    });

    $('ai-camera-input').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (f) await handleAiPhotoFile(f);
      e.target.value = '';
    });

    $('ai-gallery-input').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (f) await handleAiPhotoFile(f);
      e.target.value = '';
    });

    $('btn-ai-remove-photo').addEventListener('click', () => {
      uiState.aiImage = null;
      $('ai-photo-preview-img').src = '';
      $('ai-photo-preview-wrap').classList.add('hidden');
    });

    $('btn-run-ai-analysis').addEventListener('click', async () => {
      // Auto-save key if user pasted it in setup input without clicking "Salva" first
      const pendingKey = $('ai-api-key-input').value.trim();
      if (!api.getGeminiApiKey() && pendingKey) {
        api.setGeminiApiKey(pendingKey);
        $('profile-gemini-key').value = pendingKey;
        syncAiKeyUi(false);
      }

      const btn = $('btn-run-ai-analysis');
      const statusEl = $('ai-status-msg');
      btn.disabled = true;
      btn.textContent = '⏳ Analisi con Gemini AI in corso...';
      statusEl.classList.remove('hidden');
      statusEl.style.color = 'var(--color-carbs)';
      statusEl.textContent = '✨ Riconoscimento ingredienti, pesi e macronutrienti...';

      try {
        const result = await api.analyzeMealWithGemini({
          imageBase64: uiState.aiImage?.base64 || null,
          mimeType: uiState.aiImage?.mimeType || 'image/jpeg',
          userHint: $('ai-user-hint').value
        });
        uiState.aiResult = result;
        statusEl.classList.add('hidden');
        renderAiResults();
      } catch (err) {
        statusEl.style.color = 'var(--color-danger)';
        statusEl.textContent = `⚠️ ${err.message}`;
        if (!api.getGeminiApiKey()) {
          syncAiKeyUi(true);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = '✨ Analizza Piatto con AI';
      }
    });

    $('ai-ingredients-list').addEventListener('input', (e) => {
      if (!uiState.aiResult) return;
      if (e.target.classList.contains('ai-ing-grams-input')) {
        const idx = Number(e.target.dataset.aiIdx);
        if (uiState.aiResult.items[idx]) {
          uiState.aiResult.items[idx].grams = Math.max(0, Number(e.target.value) || 0);
          updateAiTotalsBanner();
        }
      }
    });

    $('ai-ingredients-list').addEventListener('change', (e) => {
      if (!uiState.aiResult) return;
      if (e.target.classList.contains('ai-ing-check')) {
        const idx = Number(e.target.dataset.aiIdx);
        if (uiState.aiResult.items[idx]) {
          uiState.aiResult.items[idx].checked = e.target.checked;
          updateAiTotalsBanner();
        }
      }
    });

    $('btn-confirm-ai-items').addEventListener('click', () => {
      if (!uiState.aiResult) return;
      const mealId = $('ai-target-meal').value || guessDefaultMeal();
      const selected = uiState.aiResult.items.filter((it) => it.checked && it.grams > 0);
      if (selected.length === 0) {
        showToast('Seleziona almeno un ingrediente da aggiungere');
        return;
      }

      for (const item of selected) {
        storage.addFoodEntry(uiState.selectedDate, mealId, item.food, item.grams);
      }

      // Reset modal state for next scan
      uiState.aiResult = null;
      uiState.aiImage = null;
      $('ai-photo-preview-wrap').classList.add('hidden');
      $('ai-results-box').classList.add('hidden');
      $('ai-user-hint').value = '';
      closeModal('modal-ai-meal');

      switchTab('diary');
      showToast(`✨ Aggiunti ${selected.length} alimenti dal piatto AI!`);
    });

    // Backup Export / Import / Reset
    $('btn-export-json').addEventListener('click', () => {
      const blob = new Blob([storage.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutritrack_backup_${window.formatDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('⬇️ Backup JSON scaricato!');
    });

    $('btn-import-json').addEventListener('click', () => $('import-json-input').click());

    $('import-json-input').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        storage.importJSON(text);
        applyTheme(storage.state.profile.theme);
        populateProfileForm();
        renderHeaderAndDate();
        showToast('✅ Backup ripristinato con successo!');
      } catch (err) {
        alert('Errore durante l\'importazione del file JSON: ' + err.message);
      } finally {
        e.target.value = '';
      }
    });

    $('btn-reset-all').addEventListener('click', () => {
      if (confirm('Sei sicuro di voler cancellare tutti i pasti, pesate e impostazioni salvate?')) {
        storage.resetAll();
        applyTheme(storage.state.profile.theme);
        populateProfileForm();
        switchTab('diary');
        showToast('Dati azzerati');
      }
    });

    // Close modals via close button or backdrop click
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(backdrop.id);
      });
    });

    // PWA Native Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      uiState.deferredInstallPrompt = e;
      $('pwa-install-banner').classList.remove('hidden');
    });

    $('btn-trigger-pwa-install').addEventListener('click', async () => {
      if (!uiState.deferredInstallPrompt) return;
      uiState.deferredInstallPrompt.prompt();
      await uiState.deferredInstallPrompt.userChoice;
      uiState.deferredInstallPrompt = null;
      $('pwa-install-banner').classList.add('hidden');
    });
  }

  function updateActivityEstimatedKcal() {
    const mins = Math.max(1, Number($('act-minutes').value) || 30);
    const weight = Number(storage.state.profile.weightKg) || 74;
    const met = uiState.activeMet || 4.5;
    // Standard sports physiology formula: kcal = MET * weightKg * (minutes / 60)
    const burned = Math.round(met * weight * (mins / 60));
    $('act-kcal').value = burned;
  }

  // ==================== SERVICE WORKER & URL SHORTCUTS ====================
  function registerPwaServiceWorker() {
    if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      }).catch(() => {});
    }
  }

  function handleLaunchParams() {
    const params = new URLSearchParams(window.location.search);

    // 1. Automatic 1-Tap Magic Link from Gemini Chat (?auto=1&m=...)
    if (params.get('auto') === '1' || params.get('m') || params.get('w') || params.get('act') || params.get('kg')) {
      const batch = api.parseMagicQueryParams(params);
      window.history.replaceState({}, document.title, window.location.pathname);
      if (batch) {
        applyImportBatch(batch);
        return;
      }
    }

    // 2. Android Web Share Target directly from Gemini App
    const sharedText = [params.get('share_title'), params.get('share_text'), params.get('share_url')]
      .filter(Boolean)
      .join('\n')
      .trim();
    if (sharedText) {
      window.history.replaceState({}, document.title, window.location.pathname);
      $('gchat-input').value = sharedText;
      openModal('modal-gemini-chat');
      processGeminiChatInput(sharedText, true);
      return;
    }

    // 3. Standard PWA Home Screen Shortcuts
    const action = params.get('action');
    if (action === 'add') {
      switchTab('foods');
      setTimeout(() => $('food-search-input').focus(), 100);
    } else if (action === 'scan') {
      openScannerModal();
    } else if (action === 'ai') {
      openAiMealModal();
    } else if (action === 'gchat') {
      openModal('modal-gemini-chat');
    }
  }

  // ==================== BOOTSTRAP ====================
  function init() {
    applyTheme(storage.state.profile.theme || 'dark');
    initProfileSelects();
    bindEvents();
    renderDiary();
    registerPwaServiceWorker();
    handleLaunchParams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
