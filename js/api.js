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

  window.nutriApi = {
    searchOpenFoodFacts,
    lookupBarcode,
    detectBarcodeFromImageFile,
    LiveBarcodeScanner,
    getGeminiApiKey,
    setGeminiApiKey,
    compressImageForAi,
    analyzeMealWithGemini
  };
})();
