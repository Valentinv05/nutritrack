/**
 * NutriTrack — Ricerca Online (Open Food Facts) & Lettore Codice a Barre
 */

(function () {
  function num(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function round1(val) {
    return Math.round((Number(val) || 0) * 10) / 10;
  }

  function parseServing(product) {
    let grams = num(product.serving_quantity, 0);
    const rawSize = String(product.serving_size || '').trim();

    if (!grams && rawSize) {
      const m = rawSize.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|ml)\b/i);
      if (m) {
        grams = parseFloat(m[1].replace(',', '.')) || 0;
      }
    }

    if (grams > 0 && grams <= 1500) {
      const rounded = Math.round(grams);
      const label = rawSize
        ? (rawSize.length <= 28 ? rawSize : `1 porzione (${rounded} g)`)
        : `1 porzione (${rounded} g)`;
      return { servingName: label, servingGrams: rounded };
    }

    return { servingName: '100 g', servingGrams: 100 };
  }

  function normalizeOffProduct(product) {
    if (!product) return null;
    const nutr = product.nutriments || {};

    const name = String(
      product.product_name_it ||
      product.product_name ||
      product.generic_name_it ||
      product.generic_name ||
      ''
    ).trim();

    if (!name) return null;

    let kcal = num(nutr['energy-kcal_100g'], NaN);
    if (!Number.isFinite(kcal)) {
      const kj = num(nutr['energy-kj_100g'] ?? nutr['energy_100g'], NaN);
      if (Number.isFinite(kj)) {
        kcal = kj / 4.184;
      } else {
        kcal = 0;
      }
    }

    const protein = round1(Math.max(0, num(nutr.proteins_100g, 0)));
    const carbs = round1(Math.max(0, num(nutr.carbohydrates_100g, 0)));
    const sugars = round1(Math.max(0, num(nutr.sugars_100g, 0)));
    const fat = round1(Math.max(0, num(nutr.fat_100g, 0)));
    const saturatedFat = round1(Math.max(0, num(nutr['saturated-fat_100g'], 0)));
    const fiber = round1(Math.max(0, num(nutr.fiber_100g, 0)));

    // Open Food Facts stores sodium_100g and salt_100g in grams; convert to mg
    let sodiumMg = 0;
    if (nutr.sodium_100g !== undefined && nutr.sodium_100g !== '') {
      sodiumMg = Math.round(Math.max(0, num(nutr.sodium_100g, 0)) * 1000);
    } else if (nutr.salt_100g !== undefined && nutr.salt_100g !== '') {
      sodiumMg = Math.round(Math.max(0, num(nutr.salt_100g, 0)) * 400);
    }

    // Fallback calorie estimate from macros if energy is missing
    if (kcal <= 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      kcal = protein * 4 + carbs * 4 + fat * 9 + fiber * 2;
    }

    const brandRaw = String(product.brands || '').split(',')[0].trim();
    const code = String(product.code || product._id || Date.now()).trim();
    const { servingName, servingGrams } = parseServing(product);

    return {
      id: `off_${code}`,
      barcode: code,
      name,
      brand: brandRaw || 'Open Food Facts',
      category: 'all',
      servingName,
      servingGrams,
      kcal: Math.round(Math.max(0, kcal)),
      protein,
      carbs,
      sugars,
      fat,
      saturatedFat,
      fiber,
      sodium: sodiumMg,
      imageUrl: product.image_front_small_url || '',
      isOnline: true
    };
  }

  async function searchOpenFoodFacts(query, signal) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];

    const fields = [
      'code',
      'product_name',
      'product_name_it',
      'generic_name_it',
      'brands',
      'serving_size',
      'serving_quantity',
      'nutriments',
      'image_front_small_url'
    ].join(',');

    const endpoints = [
      `https://it.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${fields}`,
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${fields}`
    ];

    let lastErr = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
        if (!res.ok) continue;
        const data = await res.json();
        const products = Array.isArray(data.products) ? data.products : [];
        const seen = new Set();
        const normalized = [];

        for (const p of products) {
          const item = normalizeOffProduct(p);
          if (!item) continue;
          const dedupKey = `${item.name.toLowerCase()}|${item.brand.toLowerCase()}`;
          if (seen.has(dedupKey)) continue;
          seen.add(dedupKey);
          normalized.push(item);
        }
        return normalized;
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        lastErr = err;
      }
    }

    throw lastErr || new Error('Impossibile contattare Open Food Facts. Controlla la connessione.');
  }

  async function lookupBarcode(rawCode) {
    const code = String(rawCode || '').replace(/\D/g, '');
    if (code.length < 8 || code.length > 14) {
      throw new Error('Inserisci un codice a barre valido (8-13 cifre, es. EAN-13).');
    }

    // Check offline cache first if offline
    if (window.nutriStorage && window.nutriStorage.state.cachedOnlineFoods[`off_${code}`]) {
      return window.nutriStorage.state.cachedOnlineFoods[`off_${code}`];
    }

    const urls = [
      `https://it.openfoodfacts.org/api/v2/product/${code}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${code}.json`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.status === 1 && data.product) {
          const item = normalizeOffProduct({ ...data.product, code });
          if (item) {
            if (window.nutriStorage) {
              window.nutriStorage.state.cachedOnlineFoods[item.id] = item;
              window.nutriStorage.save();
            }
            return item;
          }
        }
      } catch (e) {
        // Try fallback endpoint
      }
    }

    throw new Error(`Prodotto con codice ${code} non trovato nel database Open Food Facts.`);
  }

  // ===================== EAN-13 / EAN-8 SCANLINE FALLBACK DECODER =====================
  const EAN_L = {
    '0001101': 0, '0011001': 1, '0010011': 2, '0111101': 3, '0100011': 4,
    '0110001': 5, '0101111': 6, '0111011': 7, '0110111': 8, '0001011': 9
  };
  const EAN_G = {
    '0100111': 0, '0110011': 1, '0011011': 2, '0100001': 3, '0011101': 4,
    '0111001': 5, '0000101': 6, '0010001': 7, '0001001': 8, '0010111': 9
  };
  const EAN_R = {
    '1110010': 0, '1100110': 1, '1101100': 2, '1000010': 3, '1011100': 4,
    '1001110': 5, '1010000': 6, '1000100': 7, '1001000': 8, '1110100': 9
  };
  const PARITY_FIRST_DIGIT = {
    'LLLLLL': 0, 'LLGLGG': 1, 'LLGGLG': 2, 'LLGGGL': 3, 'LGLLGG': 4,
    'LGGLLG': 5, 'LGGGLL': 6, 'LGLGLG': 7, 'LGLGGL': 8, 'LGGLGL': 9
  };

  function isValidEanChecksum(digits) {
    let sum = 0;
    const len = digits.length;
    for (let i = 0; i < len - 1; i++) {
      const weight = ((len - 2 - i) % 2 === 0) ? 3 : 1;
      sum += digits[i] * weight;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === digits[len - 1];
  }

  function tryDecodeEan13Row(binaryRow) {
    // Convert binary array into run-length segments
    const runs = [];
    let cur = binaryRow[0];
    let len = 1;
    for (let i = 1; i < binaryRow.length; i++) {
      if (binaryRow[i] === cur) {
        len++;
      } else {
        runs.push({ bit: cur, len });
        cur = binaryRow[i];
        len = 1;
      }
    }
    runs.push({ bit: cur, len });

    // Look for start guard 1-0-1 (black-white-black of roughly equal width)
    for (let r = 0; r < runs.length - 58; r++) {
      if (runs[r].bit !== 1) continue;
      const g1 = runs[r].len;
      const g2 = runs[r + 1].len;
      const g3 = runs[r + 2].len;
      const unit = (g1 + g2 + g3) / 3;
      if (unit < 0.8) continue;
      if (Math.abs(g1 - unit) > unit * 0.65 || Math.abs(g2 - unit) > unit * 0.65 || Math.abs(g3 - unit) > unit * 0.65) {
        continue;
      }

      // Compute pixel start of guard and sample 95 modules
      let startPx = 0;
      for (let k = 0; k < r; k++) startPx += runs[k].len;

      // Total width estimate across 59 bars (EAN-13 has 59 alternating bars/spaces)
      let totalPx = 0;
      for (let k = r; k < r + 59 && k < runs.length; k++) totalPx += runs[k].len;
      const modWidth = totalPx / 95;
      if (modWidth < 0.9 || startPx + 95 * modWidth >= binaryRow.length) continue;

      let bits = '';
      for (let m = 0; m < 95; m++) {
        const sampleX = Math.min(binaryRow.length - 1, Math.round(startPx + (m + 0.5) * modWidth));
        bits += binaryRow[sampleX] ? '1' : '0';
      }

      if (bits.slice(0, 3) !== '101' || bits.slice(45, 50) !== '01010' || bits.slice(92, 95) !== '101') {
        continue;
      }

      let parity = '';
      const digits = [];
      let ok = true;

      for (let d = 0; d < 6; d++) {
        const chunk = bits.slice(3 + d * 7, 3 + (d + 1) * 7);
        if (EAN_L[chunk] !== undefined) {
          parity += 'L';
          digits.push(EAN_L[chunk]);
        } else if (EAN_G[chunk] !== undefined) {
          parity += 'G';
          digits.push(EAN_G[chunk]);
        } else {
          ok = false;
          break;
        }
      }
      if (!ok || PARITY_FIRST_DIGIT[parity] === undefined) continue;
      digits.unshift(PARITY_FIRST_DIGIT[parity]);

      for (let d = 0; d < 6; d++) {
        const chunk = bits.slice(50 + d * 7, 50 + (d + 1) * 7);
        if (EAN_R[chunk] !== undefined) {
          digits.push(EAN_R[chunk]);
        } else {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      if (isValidEanChecksum(digits)) {
        return digits.join('');
      }
    }
    return null;
  }

  function decodeEanFromCanvas(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    if (!width || !height) return null;

    const imageData = ctx.getImageData(0, 0, width, height).data;
    const scanFractions = [0.25, 0.35, 0.42, 0.48, 0.5, 0.52, 0.58, 0.65, 0.75];
    const votes = {};

    for (const frac of scanFractions) {
      const y = Math.floor(height * frac);
      const gray = new Float32Array(width);
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        gray[x] = 0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
      }

      // Adaptive local threshold using sliding window
      const win = Math.max(16, Math.floor(width / 16));
      const prefix = new Float64Array(width + 1);
      for (let x = 0; x < width; x++) prefix[x + 1] = prefix[x] + gray[x];

      const binary = new Uint8Array(width);
      for (let x = 0; x < width; x++) {
        const lo = Math.max(0, x - win);
        const hi = Math.min(width - 1, x + win);
        const localMean = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
        binary[x] = gray[x] < localMean * 0.94 ? 1 : 0;
      }

      const forward = tryDecodeEan13Row(binary);
      if (forward) {
        votes[forward] = (votes[forward] || 0) + 1;
        if (votes[forward] >= 2) return forward;
      }

      // Also check upside-down barcode
      const reversed = binary.slice().reverse();
      const backward = tryDecodeEan13Row(reversed);
      if (backward) {
        votes[backward] = (votes[backward] || 0) + 1;
        if (votes[backward] >= 2) return backward;
      }
    }

    // Return single high-confidence checksum match if found
    const candidates = Object.keys(votes);
    return candidates.length === 1 ? candidates[0] : null;
  }

  async function detectBarcodeFromImageFile(file) {
    const bitmap = await createImageBitmap(file);

    // 1. Native BarcodeDetector (Chrome / Edge / Android WebView)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
        });
        const codes = await detector.detect(bitmap);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          bitmap.close?.();
          return codes[0].rawValue;
        }
      } catch (e) {
        // Fallback to JS scanline decoder
      }
    }

    // 2. Pure-JS EAN-13 scanline fallback (horizontal & rotated 90 deg)
    const maxDim = 1400;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, w, h);

    let code = decodeEanFromCanvas(canvas);
    if (!code) {
      // Try rotated 90 degrees in case user held phone vertically on vertical barcode
      canvas.width = h;
      canvas.height = w;
      ctx.save();
      ctx.translate(h / 2, w / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
      ctx.restore();
      code = decodeEanFromCanvas(canvas);
    }

    bitmap.close?.();
    return code;
  }

  class LiveBarcodeScanner {
    constructor() {
      this.stream = null;
      this.rafId = null;
      this.running = false;
    }

    canStreamCamera() {
      return Boolean(
        window.isSecureContext &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
      );
    }

    async start(videoEl, onDetected, onError) {
      this.stop();
      if (!this.canStreamCamera()) {
        onError?.('La fotocamera live richiede HTTPS o localhost. Usa "Scatta foto al codice" oppure inserisci il codice sotto.');
        return false;
      }

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        videoEl.srcObject = this.stream;
        await videoEl.play();
        this.running = true;

        const nativeDetector = ('BarcodeDetector' in window)
          ? new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
          : null;

        const helperCanvas = document.createElement('canvas');
        let lastScan = 0;

        const tick = async (now) => {
          if (!this.running) return;
          if (now - lastScan > 240 && videoEl.readyState >= 2) {
            lastScan = now;
            try {
              if (nativeDetector) {
                const found = await nativeDetector.detect(videoEl);
                if (found && found.length > 0 && found[0].rawValue) {
                  const val = found[0].rawValue;
                  this.stop();
                  onDetected(val);
                  return;
                }
              } else {
                helperCanvas.width = videoEl.videoWidth;
                helperCanvas.height = videoEl.videoHeight;
                helperCanvas.getContext('2d', { willReadFrequently: true }).drawImage(videoEl, 0, 0);
                const val = decodeEanFromCanvas(helperCanvas);
                if (val) {
                  this.stop();
                  onDetected(val);
                  return;
                }
              }
            } catch (err) {
              // Ignore transient frame errors
            }
          }
          this.rafId = requestAnimationFrame(tick);
        };

        this.rafId = requestAnimationFrame(tick);
        return true;
      } catch (err) {
        this.stop();
        onError?.('Permesso fotocamera negato o non disponibile. Usa il pulsante "Scatta foto al codice" o inserisci le cifre.');
        return false;
      }
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.stream) {
        for (const t of this.stream.getTracks()) {
          t.stop();
        }
        this.stream = null;
      }
    }
  }

  // ===================== GEMINI 3.8 FLASH — AI MEAL RECOGNITION =====================
  const GEMINI_KEY_STORAGE = 'nutritrack_gemini_api_key_v1';
  const GEMINI_MODEL = 'gemini-3.8-flash';
  const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

  function getGeminiApiKey() {
    try {
      return (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function setGeminiApiKey(key) {
    try {
      const clean = String(key || '').trim();
      if (clean) {
        localStorage.setItem(GEMINI_KEY_STORAGE, clean);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function compressImageForAi(file, maxDim = 1024, quality = 0.82) {
    const dataUrl = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const w = Math.max(1, Math.round((img.naturalWidth || 800) * scale));
          const h = Math.max(1, Math.round((img.naturalHeight || 600) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', quality);
          URL.revokeObjectURL(url);
          resolve(out);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Impossibile leggere l\'immagine selezionata.'));
      };
      img.src = url;
    });

    const commaIdx = dataUrl.indexOf(',');
    return {
      previewDataUrl: dataUrl,
      base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
      mimeType: 'image/jpeg'
    };
  }

  const MEAL_ANALYSIS_SCHEMA = {
    type: 'object',
    properties: {
      dish_name: {
        type: 'string',
        description: 'Nome complessivo del piatto o pasto in italiano.'
      },
      confidence: {
        type: 'string',
        enum: ['alta', 'media', 'bassa'],
        description: 'Livello di confidenza della stima delle porzioni.'
      },
      notes: {
        type: 'string',
        description: 'Breve spiegazione in italiano su porzioni e condimenti stimati.'
      },
      items: {
        type: 'array',
        description: 'Lista degli ingredienti o alimenti distinti nel piatto.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nome in italiano, specificando "(cotto)" se il peso stimato nel piatto è da cotto.'
            },
            estimated_grams: {
              type: 'number',
              description: 'Peso stimato in grammi dell\'alimento così come presente nel piatto.'
            },
            kcal_per_100g: {
              type: 'number',
              description: 'Calorie (kcal) per 100g nello stesso stato fisico (cotto/crudo) di estimated_grams.'
            },
            carbs_per_100g: {
              type: 'number',
              description: 'Carboidrati in grammi per 100g.'
            },
            sugars_per_100g: {
              type: 'number',
              description: 'Zuccheri in grammi per 100g.'
            },
            protein_per_100g: {
              type: 'number',
              description: 'Proteine in grammi per 100g.'
            },
            fat_per_100g: {
              type: 'number',
              description: 'Grassi totali in grammi per 100g.'
            },
            saturated_fat_per_100g: {
              type: 'number',
              description: 'Grassi saturi in grammi per 100g.'
            },
            fiber_per_100g: {
              type: 'number',
              description: 'Fibre in grammi per 100g.'
            },
            sodium_mg_per_100g: {
              type: 'number',
              description: 'Sodio in milligrammi (mg) per 100g.'
            }
          },
          required: [
            'name',
            'estimated_grams',
            'kcal_per_100g',
            'carbs_per_100g',
            'protein_per_100g',
            'fat_per_100g'
          ]
        }
      }
    },
    required: ['dish_name', 'confidence', 'notes', 'items']
  };

  async function analyzeMealWithGemini({ imageBase64, mimeType, userHint }) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error('Inserisci prima la tua chiave API Gemini gratuita per attivare il riconoscimento AI.');
    }
    if (!imageBase64 && (!userHint || !userHint.trim())) {
      throw new Error('Scatta/scegli una foto del piatto oppure scrivi cosa hai mangiato.');
    }

    const systemInstruction = [
      'Sei un nutrizionista italiano esperto nella valutazione visiva dei piatti e nelle tabelle nutrizionali CREA / BDA-IEO.',
      'Identifica con precisione ogni componente/ingrediente del pasto (inclusi i condimenti probabili come olio extravergine d\'oliva, salse o formaggio grattugiato).',
      'REGOLA FONDAMENTALE: i valori per 100g (kcal_per_100g, carbs_per_100g, protein_per_100g, fat_per_100g, ecc.) DEVONO corrispondere allo stesso stato (cotto o crudo) del peso stimato nel piatto (estimated_grams).',
      'Ad esempio, per 180g di pasta cotta nel piatto usa i valori della pasta cotta (~155 kcal/100g) e scrivi "(cotta)" nel nome.'
    ].join(' ');

    const promptParts = [];
    if (imageBase64) {
      promptParts.push({
        type: 'image',
        data: imageBase64,
        mime_type: mimeType || 'image/jpeg'
      });
    }

    const textPrompt = userHint && userHint.trim()
      ? `Analizza questo pasto tenendo conto anche di questa indicazione dell'utente: "${userHint.trim()}". Restituisci gli alimenti riconosciuti con peso stimato in grammi e valori nutrizionali per 100g.`
      : 'Analizza la foto di questo piatto, riconosci tutti gli alimenti e condimenti presenti, stima i grammi di ciascuno nel piatto e i relativi valori nutrizionali per 100g.';

    promptParts.push({ type: 'text', text: textPrompt });

    const res = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
        'Api-Revision': '2026-05-20'
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        store: false,
        system_instruction: systemInstruction,
        input: promptParts,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: MEAL_ANALYSIS_SCHEMA
        }
      })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const apiMsg = data?.error?.message || `Errore API Gemini (HTTP ${res.status})`;
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(`Chiave API non valida o non autorizzata: ${apiMsg}`);
      }
      throw new Error(apiMsg);
    }

    let outputText = typeof data?.output_text === 'string' ? data.output_text : '';
    if (!outputText && Array.isArray(data?.steps)) {
      const chunks = [];
      for (let i = data.steps.length - 1; i >= 0; i--) {
        const step = data.steps[i];
        if (step && step.type === 'model_output' && Array.isArray(step.content)) {
          for (const part of step.content) {
            if (part && part.type === 'text' && typeof part.text === 'string') {
              chunks.push(part.text);
            }
          }
          if (chunks.length > 0) break;
        }
      }
      outputText = chunks.join('');
    }

    if (!outputText) {
      throw new Error('Risposta vuota dal modello AI. Riprova con una foto più nitida.');
    }

    const parsed = JSON.parse(outputText);
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error('Nessun alimento riconosciuto nella foto. Prova ad aggiungere una breve descrizione.');
    }

    return {
      dishName: String(parsed.dish_name || 'Piatto analizzato con AI').trim(),
      confidence: parsed.confidence || 'media',
      notes: String(parsed.notes || '').trim(),
      items: parsed.items.map((it, idx) => ({
        tempId: `ai_item_${Date.now()}_${idx}`,
        checked: true,
        name: String(it.name || 'Alimento').trim(),
        grams: Math.max(1, Math.round(num(it.estimated_grams, 100))),
        food: {
          id: `custom_ai_${Date.now()}_${idx}`,
          name: String(it.name || 'Alimento').trim(),
          brand: 'Stima Gemini AI ✨',
          servingName: `Porzione stimata (${Math.max(1, Math.round(num(it.estimated_grams, 100)))} g)`,
          servingGrams: Math.max(1, Math.round(num(it.estimated_grams, 100))),
          kcal: Math.max(0, Math.round(num(it.kcal_per_100g, 0))),
          carbs: round1(Math.max(0, num(it.carbs_per_100g, 0))),
          sugars: round1(Math.max(0, num(it.sugars_per_100g, 0))),
          protein: round1(Math.max(0, num(it.protein_per_100g, 0))),
          fat: round1(Math.max(0, num(it.fat_per_100g, 0))),
          saturatedFat: round1(Math.max(0, num(it.saturated_fat_per_100g, 0))),
          fiber: round1(Math.max(0, num(it.fiber_per_100g, 0))),
          sodium: Math.max(0, Math.round(num(it.sodium_mg_per_100g, 0)))
        }
      }))
    };
  }

  // ===================== GEMINI CHAT AUTO-IMPORT & MAGIC LINK =====================
  function normalizeMealSlot(raw, fallback = 'pranzo') {
    const s = String(raw || '').toLowerCase().trim();
    if (s.startsWith('col') || s.includes('colazione') || s.includes('breakfast')) return 'colazione';
    if (s.startsWith('pra') || s.includes('pranzo') || s.includes('lunch')) return 'pranzo';
    if (s.startsWith('cen') || s.includes('cena') || s.includes('dinner')) return 'cena';
    if (s.startsWith('spu') || s.includes('spuntin') || s.includes('merend') || s.includes('snack')) return 'spuntini';
    return fallback;
  }

  function makeFoodFromPortionTotals({ name, grams, totalKcal, totalCarbs, totalProtein, totalFat, totalFiber = 0, totalSugars = 0, brand = 'Chat Gemini 💬' }) {
    const g = Math.max(1, Number(grams) || 100);
    const factor = 100 / g;
    return {
      id: `gchat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(name || 'Alimento da Gemini').trim(),
      brand,
      servingName: `Porzione (${Math.round(g)} g)`,
      servingGrams: Math.round(g),
      kcal: Math.max(0, num(totalKcal, 0) * factor),
      carbs: Math.max(0, num(totalCarbs, 0) * factor),
      sugars: Math.max(0, num(totalSugars, 0) * factor),
      protein: Math.max(0, num(totalProtein, 0) * factor),
      fat: Math.max(0, num(totalFat, 0) * factor),
      saturatedFat: 0,
      fiber: Math.max(0, num(totalFiber, 0) * factor),
      sodium: 0
    };
  }

  function parseNumLocale(val, fallback = 0) {
    if (val === undefined || val === null || val === '') return fallback;
    const n = parseFloat(String(val).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  }

  function parseMagicQueryParams(inputParamsOrUrl) {
    let params = null;
    if (inputParamsOrUrl instanceof URLSearchParams) {
      params = inputParamsOrUrl;
    } else {
      const str = String(inputParamsOrUrl || '');
      const urlMatch = str.match(/https?:\/\/[^\s)\]"']+\?([^\s)\]"']+)/i);
      if (urlMatch) {
        params = new URLSearchParams(urlMatch[1]);
      } else if (str.includes('auto=1') && str.includes('m=')) {
        const qIdx = str.indexOf('?');
        params = new URLSearchParams(qIdx >= 0 ? str.slice(qIdx + 1) : str.trim());
      }
    }
    if (!params) return null;
    if (!params.get('m') && !params.get('w') && !params.get('act') && !params.get('kg') && !params.get('steps')) {
      return null;
    }

    const meals = [];
    const rawM = params.get('m') || '';
    for (const seg of rawM.split(';')) {
      const cleanSeg = seg.trim();
      if (!cleanSeg) continue;
      const parts = cleanSeg.split(':');
      if (parts.length < 4) continue;

      const mealId = normalizeMealSlot(parts[0], 'pranzo');
      const name = decodeURIComponent(parts[1] || 'Alimento')
        .replace(/[_+]+/g, ' ')
        .trim();
      const grams = Math.max(1, Math.round(parseNumLocale(parts[2], 100)));
      const totalKcal = Math.max(0, parseNumLocale(parts[3], 0));
      const totalCarbs = Math.max(0, parseNumLocale(parts[4], 0));
      const totalProtein = Math.max(0, parseNumLocale(parts[5], 0));
      const totalFat = Math.max(0, parseNumLocale(parts[6], 0));
      const totalFiber = Math.max(0, parseNumLocale(parts[7], 0));

      meals.push({
        mealId,
        grams,
        checked: true,
        food: makeFoodFromPortionTotals({
          name,
          grams,
          totalKcal,
          totalCarbs,
          totalProtein,
          totalFat,
          totalFiber,
          brand: 'Link Chat Gemini ⚡'
        })
      });
    }

    const waterMl = Math.max(0, Math.round(parseNumLocale(params.get('w'), 0)));

    const activities = [];
    const rawAct = params.get('act') || '';
    for (const seg of rawAct.split(';')) {
      const cleanSeg = seg.trim();
      if (!cleanSeg) continue;
      const parts = cleanSeg.split(':');
      const actName = decodeURIComponent(parts[0] || 'Allenamento').replace(/[_+]+/g, ' ').trim();
      const mins = Math.max(1, Math.round(parseNumLocale(parts[1], 30)));
      const burned = Math.max(1, Math.round(parseNumLocale(parts[2], 150)));
      activities.push({ name: actName, minutes: mins, kcal: burned });
    }

    const kgVal = parseNumLocale(params.get('kg'), NaN);
    const weightKg = Number.isFinite(kgVal) && kgVal >= 25 && kgVal <= 350 ? round1(kgVal) : null;
    const steps = Math.max(0, Math.round(parseNumLocale(params.get('steps'), 0)));
    const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;

    if (meals.length === 0 && waterMl === 0 && activities.length === 0 && !weightKg && steps === 0) {
      return null;
    }

    return {
      sourceLabel: 'Link Automatico Gemini',
      dateKey,
      meals,
      waterMl,
      steps,
      activities,
      weightKg
    };
  }

  function parseGeminiChatOffline(rawText, defaultMeal = 'pranzo') {
    const magic = parseMagicQueryParams(rawText);
    if (magic) return magic;

    const text = String(rawText || '').trim();
    if (!text) {
      throw new Error('Incolla un messaggio della tua chat con Gemini.');
    }

    const meals = [];
    let waterMl = 0;
    let steps = 0;
    let weightKg = null;
    const activities = [];
    let currentMeal = defaultMeal;

    const localFoods = window.nutriStorage ? window.nutriStorage.getAllLocalFoods() : (window.BUILTIN_FOODS || []);

    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.replace(/\*+/g, '').trim();
      if (!line) continue;
      const lower = line.toLowerCase();

      // Detect section headers (e.g. "Colazione:", "### Pranzo", "A cena:")
      if (/^(?:[#\-•\d.)\s☀️🍝🌙🍎🥗]*)?(?:per\s+|a\s+)?(colazione|pranzo|cena|spuntin[oi]|merenda|snack)\b\s*[:\-–]?$/i.test(line)) {
        currentMeal = normalizeMealSlot(line, currentMeal);
        continue;
      }
      if (/^(?:colazione|a colazione)\s*:/i.test(lower)) currentMeal = 'colazione';
      else if (/^(?:pranzo|a pranzo)\s*:/i.test(lower)) currentMeal = 'pranzo';
      else if (/^(?:cena|a cena)\s*:/i.test(lower)) currentMeal = 'cena';
      else if (/^(?:spuntin[oi]|merenda|snack)\s*:/i.test(lower)) currentMeal = 'spuntini';

      // Skip total/summary lines to avoid double counting
      if (/^(?:totale|riepilogo|somma|fabbisogno|obiettivo|target|calorie totali|macro totali)\b/i.test(lower)) {
        continue;
      }

      // Detect water
      const waterLiters = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litr[oi])\s+(?:di\s+|d')?acqua/);
      const waterMlMatch = lower.match(/(\d{2,4})\s*ml\s+(?:di\s+|d')?acqua/);
      const waterGlasses = lower.match(/(\d+)\s*bicchier[ei]\s+(?:di\s+|d')?acqua/);
      if (waterLiters) {
        waterMl += Math.round(parseNumLocale(waterLiters[1], 0) * 1000);
        continue;
      }
      if (waterMlMatch) {
        waterMl += Math.round(parseNumLocale(waterMlMatch[1], 0));
        continue;
      }
      if (waterGlasses) {
        waterMl += Math.round(parseNumLocale(waterGlasses[1], 0) * 200);
        continue;
      }

      // Detect steps (e.g. "8500 passi", "8.500 passi")
      const stepsMatch = lower.match(/\b(\d{1,3}(?:[.\s]\d{3})+|\d{3,6})\s*passi\b/);
      if (stepsMatch) {
        const cleanSteps = Number(stepsMatch[1].replace(/[.\s]/g, '')) || 0;
        if (cleanSteps > 0 && cleanSteps <= 150000) steps = Math.max(steps, cleanSteps);
        continue;
      }

      // Detect body weight
      const weightMatch = lower.match(/\bpeso(?:\s+corporeo|\s+attuale)?\s*[:=]?\s*(\d{2,3}(?:[.,]\d)?)\s*kg\b/);
      if (weightMatch) {
        const w = parseNumLocale(weightMatch[1], 0);
        if (w >= 25 && w <= 350) weightKg = round1(w);
        continue;
      }

      // Strip meal prefix if inline ("Colazione: Yogurt greco 150g - 90 kcal")
      const cleanedLine = line
        .replace(/^[-•*+]\s*/, '')
        .replace(/^(?:colazione|pranzo|cena|spuntin[oi]|merenda|snack)\s*:\s*/i, '')
        .trim();

      // Case A: Line includes explicit kcal (typical Gemini chat response!)
      const kcalMatch = cleanedLine.match(/(\d+(?:[.,]\d+)?)\s*(?:kcal|calorie)\b/i);
      if (kcalMatch) {
        const totalKcal = parseNumLocale(kcalMatch[1], 0);
        if (totalKcal <= 0 || totalKcal > 5000) continue;

        const beforeKcal = cleanedLine.slice(0, kcalMatch.index);
        const gramsMatch = beforeKcal.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammi|ml)\b/i);
        const grams = gramsMatch ? Math.max(1, Math.round(parseNumLocale(gramsMatch[1], 100))) : 100;

        const carbsM = cleanedLine.match(/(?:carbo(?:idrati)?|\bC)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i)
          || cleanedLine.match(/(\d+(?:[.,]\d+)?)\s*g?\s*(?:di\s+)?carbo(?:idrati)?\b/i);
        const protM = cleanedLine.match(/(?:protein[ea]|prot|\bP)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i)
          || cleanedLine.match(/(\d+(?:[.,]\d+)?)\s*g?\s*(?:di\s+)?protein[ea]\b/i);
        const fatM = cleanedLine.match(/(?:grassi|lipidi|\bG)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i)
          || cleanedLine.match(/(\d+(?:[.,]\d+)?)\s*g?\s*(?:di\s+)?grassi\b/i);

        let itemName = beforeKcal
          .replace(/\(\s*\d+(?:[.,]\d+)?\s*(?:g|gr|grammi|ml)\s*\)/gi, '')
          .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|gr|grammi|ml)\b/gi, '')
          .replace(/[-–:—:(]+\s*$/, '')
          .replace(/^\s*[-–:—]+\s*/, '')
          .trim();

        if (!itemName || itemName.length < 2) itemName = 'Alimento da chat';

        meals.push({
          mealId: currentMeal,
          grams,
          checked: true,
          food: makeFoodFromPortionTotals({
            name: itemName,
            grams,
            totalKcal,
            totalCarbs: carbsM ? parseNumLocale(carbsM[1], 0) : 0,
            totalProtein: protM ? parseNumLocale(protM[1], 0) : 0,
            totalFat: fatM ? parseNumLocale(fatM[1], 0) : 0,
            brand: 'Chat Gemini 💬'
          })
        });
        continue;
      }

      // Case B: Line without kcal -> match against built-in Italian food DB
      const gramsInline = cleanedLine.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammi|ml)\b/i);
      const normLine = cleanedLine
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normLine.length >= 3 && normLine.length <= 90) {
        let bestFood = null;
        let bestScore = 0;
        for (const f of localFoods) {
          const fNorm = f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const words = fNorm.split(/\W+/).filter((w) => w.length >= 4);
          if (words.length === 0) continue;
          const hits = words.filter((w) => normLine.includes(w)).length;
          const score = hits / words.length + (normLine.includes(fNorm) ? 1 : 0);
          if (hits >= 1 && score > bestScore && score >= 0.6) {
            bestScore = score;
            bestFood = f;
          }
        }
        if (bestFood) {
          const grams = gramsInline
            ? Math.max(1, Math.round(parseNumLocale(gramsInline[1], bestFood.servingGrams || 100)))
            : (bestFood.servingGrams || 100);
          meals.push({
            mealId: currentMeal,
            grams,
            checked: true,
            food: bestFood
          });
        }
      }
    }

    if (meals.length === 0 && waterMl === 0 && activities.length === 0 && !weightKg && steps === 0) {
      throw new Error(
        'Non sono riuscito a individuare alimenti nel testo senza chiave API. Configura la chiave API Gemini gratuita per far leggere qualsiasi chat o link in automatico, oppure usa il "Prompt Automatico per Gemini" qui sotto!'
      );
    }

    return {
      sourceLabel: 'Parser Rapido Chat',
      dateKey: null,
      meals,
      waterMl,
      steps,
      activities,
      weightKg
    };
  }

  const CHAT_IMPORT_SCHEMA = {
    type: 'object',
    properties: {
      summary_note: {
        type: 'string',
        description: 'Breve riepilogo in italiano di cosa è stato estratto dalla chat.'
      },
      meals: {
        type: 'array',
        description: 'Tutti gli alimenti consumati o previsti estratti dalla chat.',
        items: {
          type: 'object',
          properties: {
            meal_slot: {
              type: 'string',
              enum: ['colazione', 'pranzo', 'cena', 'spuntini'],
              description: 'Pasto della giornata.'
            },
            name: {
              type: 'string',
              description: 'Nome dell\'alimento in italiano.'
            },
            grams: {
              type: 'number',
              description: 'Peso della porzione in grammi o ml.'
            },
            total_kcal: {
              type: 'number',
              description: 'Calorie TOTALI (kcal) di questa porzione.'
            },
            total_carbs_g: {
              type: 'number',
              description: 'Carboidrati TOTALI (g) di questa porzione.'
            },
            total_sugars_g: {
              type: 'number',
              description: 'Zuccheri TOTALI (g) di questa porzione.'
            },
            total_protein_g: {
              type: 'number',
              description: 'Proteine TOTALI (g) di questa porzione.'
            },
            total_fat_g: {
              type: 'number',
              description: 'Grassi TOTALI (g) di questa porzione.'
            },
            total_fiber_g: {
              type: 'number',
              description: 'Fibre TOTALI (g) di questa porzione.'
            }
          },
          required: ['meal_slot', 'name', 'grams', 'total_kcal', 'total_carbs_g', 'total_protein_g', 'total_fat_g']
        }
      },
      water_ml: {
        type: 'number',
        description: 'Acqua totale bevuta in ml se menzionata nella chat, altrimenti 0.'
      },
      steps: {
        type: 'number',
        description: 'Numero di passi effettuati se menzionati nella chat, altrimenti 0.'
      },
      activities: {
        type: 'array',
        description: 'Eventuali allenamenti o attività fisiche menzionate nella chat.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            minutes: { type: 'number' },
            burned_kcal: { type: 'number' }
          },
          required: ['name', 'minutes', 'burned_kcal']
        }
      },
      weight_kg: {
        type: 'number',
        description: 'Peso corporeo in kg se comunicato dall\'utente nella chat, altrimenti 0.'
      }
    },
    required: ['summary_note', 'meals', 'water_ml', 'steps', 'activities', 'weight_kg']
  };

  async function importFromGeminiChat(rawText, defaultMeal = 'pranzo') {
    const trimmed = String(rawText || '').trim();
    if (!trimmed) {
      throw new Error('Incolla il testo o il link della tua chat con Gemini.');
    }

    // 1. Instant parse if text already contains our Magic Link (?auto=1&m=...)
    const directMagic = parseMagicQueryParams(trimmed);
    if (directMagic) return directMagic;

    // 2. If Gemini API key is configured, use Gemini 3.8 Flash (+ url_context if URL present)
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return parseGeminiChatOffline(trimmed, defaultMeal);
    }

    const hasUrl = /https?:\/\/\S+/i.test(trimmed);
    const bodyPayload = {
      model: GEMINI_MODEL,
      store: false,
      system_instruction: [
        'Sei l\'assistente di importazione automatica di NutriTrack.',
        'L\'utente ti fornisce il testo copiato da una sua chat con Gemini (oppure un link condiviso a una chat/pagina).',
        'Estrai con precisione tutti i cibi consumati o pianificati assegnandoli a colazione, pranzo, cena o spuntini.',
        'Per ciascun alimento indica i grammi della porzione e le calorie/macronutrienti TOTALI di quella porzione (se nella chat non sono esplicitati i macro, calcolali accuratamente secondo le tabelle CREA italiane).',
        'Estrai anche eventuale acqua bevuta (in ml), passi camminati, attività fisica/sport e peso corporeo se presenti.'
      ].join(' '),
      input: hasUrl
        ? `Leggi il contenuto di questo link/testo della chat Gemini ed estrai tutti i pasti, acqua, passi, attività e peso da inserire nel diario:\n\n${trimmed}`
        : `Estrai tutti i pasti, acqua, passi, attività e peso da questa conversazione con Gemini:\n\n${trimmed}`,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: CHAT_IMPORT_SCHEMA
      }
    };

    if (hasUrl) {
      bodyPayload.tools = [{ type: 'url_context' }];
    }

    const res = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
        'Api-Revision': '2026-05-20'
      },
      body: JSON.stringify(bodyPayload)
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || `Errore API Gemini (HTTP ${res.status})`);
    }

    let outputText = typeof data?.output_text === 'string' ? data.output_text : '';
    if (!outputText && Array.isArray(data?.steps)) {
      const chunks = [];
      for (let i = data.steps.length - 1; i >= 0; i--) {
        const step = data.steps[i];
        if (step && step.type === 'model_output' && Array.isArray(step.content)) {
          for (const part of step.content) {
            if (part && part.type === 'text' && typeof part.text === 'string') {
              chunks.push(part.text);
            }
          }
          if (chunks.length > 0) break;
        }
      }
      outputText = chunks.join('');
    }

    const parsed = JSON.parse(outputText || '{}');
    const meals = (parsed.meals || []).map((m) => {
      const grams = Math.max(1, Math.round(num(m.grams, 100)));
      return {
        mealId: normalizeMealSlot(m.meal_slot, defaultMeal),
        grams,
        checked: true,
        food: makeFoodFromPortionTotals({
          name: m.name,
          grams,
          totalKcal: m.total_kcal,
          totalCarbs: m.total_carbs_g,
          totalProtein: m.total_protein_g,
          totalFat: m.total_fat_g,
          totalFiber: m.total_fiber_g || 0,
          totalSugars: m.total_sugars_g || 0,
          brand: 'Chat Gemini AI ✨'
        })
      };
    });

    const waterMl = Math.max(0, Math.round(num(parsed.water_ml, 0)));
    const steps = Math.max(0, Math.round(num(parsed.steps, 0)));
    const activities = (parsed.activities || []).map((a) => ({
      name: String(a.name || 'Allenamento').trim(),
      minutes: Math.max(1, Math.round(num(a.minutes, 30))),
      kcal: Math.max(1, Math.round(num(a.burned_kcal, 150)))
    }));
    const wKg = num(parsed.weight_kg, 0);
    const weightKg = wKg >= 25 && wKg <= 350 ? round1(wKg) : null;

    if (meals.length === 0 && waterMl === 0 && activities.length === 0 && !weightKg && steps === 0) {
      throw new Error(
        hasUrl
          ? 'Il link condiviso non contiene pasti leggibili pubblicamente. Copia i messaggi direttamente dall\'app Gemini e incollali qui!'
          : 'Nessun pasto, acqua o allenamento individuato nel testo incollato.'
      );
    }

    return {
      sourceLabel: 'Estrazione AI Chat Gemini',
      summaryNote: parsed.summary_note || '',
      dateKey: null,
      meals,
      waterMl,
      steps,
      activities,
      weightKg
    };
  }

  function buildGeminiCompanionPrompt(appBaseUrl) {
    const cleanBase = String(appBaseUrl || 'https://valentinv05.github.io/nutritrack/').split('?')[0];
    return [
      'Da questo momento sei collegato alla mia app alimentare NutriTrack.',
      'Ogni volta che in questa chat ti dico cosa ho mangiato, bevuto, i miei passi, il mio allenamento o il mio peso (anche tramite foto o messaggio vocale), calcola calorie e macronutrienti e in fondo alla tua risposta aggiungi SEMPRE un link cliccabile in Markdown chiamato "📲 Inserisci in automatico su NutriTrack" seguendo esattamente questo formato URL:',
      '',
      `[📲 Inserisci in automatico su NutriTrack](${cleanBase}?auto=1&m=PASTO:Nome_Cibo:GRAMMI:KCAL_TOT:CARBO_TOT:PROTEINE_TOT:GRASSI_TOT)`,
      '',
      'Regole obbligatorie per generare il link:',
      '1. PASTO deve essere solo uno tra: colazione, pranzo, cena, spuntini.',
      '2. Nei nomi usa il trattino basso _ al posto degli spazi e non usare accenti/simboli speciali nell\'URL (es. Pasta_al_pomodoro). Usa il punto per i decimali.',
      '3. KCAL_TOT, CARBO_TOT, PROTEINE_TOT e GRASSI_TOT sono i valori TOTALI della porzione mangiata (non per 100g).',
      '4. Se ci sono più alimenti separali con punto e virgola (;), esempio: m=colazione:Yogurt_greco:150:86:6:15:0;pranzo:Petto_di_pollo:150:165:0:35:2',
      '5. Se ho bevuto acqua aggiungi &w=ML (es. &w=500). Se indico i passi aggiungi &steps=PASSI (es. &steps=8500). Se ho fatto sport aggiungi &act=Sport:MINUTI:KCAL (es. &act=Corsa:30:280). Se indico il mio peso aggiungi &kg=PESO (es. &kg=73.5).'
    ].join('\n');
  }

  // ===================== LIVE ACCELEROMETER PEDOMETER (CONTAPASSI) =====================
  class LiveStepCounter {
    constructor() {
      this.active = false;
      this.wakeLock = null;
      this.onStep = null;
      this.gravity = 9.81;
      this.ringBuf = [0, 0, 0];
      this.ringIdx = 0;
      this.abovePeak = false;
      this.lastStepTs = 0;
      this.pendingFirstStepTs = 0;
      this._boundMotion = this._handleMotion.bind(this);
      this._boundVisibility = this._handleVisibility.bind(this);
    }

    async _acquireWakeLock() {
      if (this.active && document.visibilityState === 'visible' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {
          this.wakeLock = null;
        }
      }
    }

    _handleVisibility() {
      if (this.active && document.visibilityState === 'visible' && (!this.wakeLock || this.wakeLock.released)) {
        this._acquireWakeLock();
      }
    }

    isSupported() {
      return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    }

    async start(onStepCallback) {
      if (this.active) return { ok: true };
      if (!this.isSupported()) {
        return { ok: false, error: 'Sensori di movimento non supportati su questo dispositivo (usa il telefono!).' };
      }

      // iOS 13+ requires explicit permission inside a user tap handler
      if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
        try {
          const perm = await window.DeviceMotionEvent.requestPermission();
          if (perm !== 'granted') {
            return { ok: false, error: 'Permesso sensori di movimento negato su iPhone.' };
          }
        } catch (err) {
          return { ok: false, error: 'Impossibile richiedere il permesso ai sensori di movimento.' };
        }
      }

      this.onStep = onStepCallback;
      this.active = true;
      this.gravity = 9.81;
      this.ringBuf = [0, 0, 0];
      this.abovePeak = false;
      this.lastStepTs = 0;
      this.pendingFirstStepTs = 0;

      window.addEventListener('devicemotion', this._boundMotion, { passive: true });
      document.addEventListener('visibilitychange', this._boundVisibility);

      // Keep screen awake during live walking session if supported
      await this._acquireWakeLock();

      return { ok: true };
    }

    _handleMotion(event) {
      if (!this.active) return;
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const mag = Math.hypot(acc.x, acc.y, acc.z);
      // Dynamic gravity baseline
      this.gravity = 0.92 * this.gravity + 0.08 * mag;
      const dyn = mag - this.gravity;

      // 3-sample moving average to filter hand jitter
      this.ringBuf[this.ringIdx % 3] = dyn;
      this.ringIdx++;
      const smooth = (this.ringBuf[0] + this.ringBuf[1] + this.ringBuf[2]) / 3;

      const now = performance.now();
      const HIGH_THRESH = 1.22;
      const LOW_THRESH = 0.32;
      const MIN_STEP_MS = 270;
      const MAX_RHYTHM_MS = 2100;

      if (!this.abovePeak && smooth > HIGH_THRESH) {
        this.abovePeak = true;
      } else if (this.abovePeak && smooth < LOW_THRESH) {
        this.abovePeak = false;
        const dt = now - this.lastStepTs;

        if (dt >= MIN_STEP_MS) {
          // Require 2 rhythmic impulses when starting from rest to avoid false triggers when picking up phone
          if (this.lastStepTs === 0 || dt > MAX_RHYTHM_MS) {
            if (this.pendingFirstStepTs > 0 && now - this.pendingFirstStepTs <= MAX_RHYTHM_MS && now - this.pendingFirstStepTs >= MIN_STEP_MS) {
              this.lastStepTs = now;
              this.pendingFirstStepTs = 0;
              this.onStep?.(2); // Credit both initial rhythmic steps!
            } else {
              this.pendingFirstStepTs = now;
            }
          } else {
            this.lastStepTs = now;
            this.onStep?.(1);
          }
        }
      }
    }

    stop() {
      this.active = false;
      window.removeEventListener('devicemotion', this._boundMotion);
      document.removeEventListener('visibilitychange', this._boundVisibility);
      if (this.wakeLock) {
        try { this.wakeLock.release(); } catch (e) {}
        this.wakeLock = null;
      }
    }
  }

  window.nutriApi = {
    searchOpenFoodFacts,
    lookupBarcode,
    detectBarcodeFromImageFile,
    LiveBarcodeScanner,
    LiveStepCounter,
    getGeminiApiKey,
    setGeminiApiKey,
    compressImageForAi,
    analyzeMealWithGemini,
    parseMagicQueryParams,
    parseGeminiChatOffline,
    importFromGeminiChat,
    buildGeminiCompanionPrompt
  };
})();
