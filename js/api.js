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

  window.nutriApi = {
    searchOpenFoodFacts,
    lookupBarcode,
    detectBarcodeFromImageFile,
    LiveBarcodeScanner
  };
})();
