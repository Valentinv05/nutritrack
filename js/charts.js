/**
 * NutriTrack — Grafici SVG Interattivi & Responsivi (Zero Dipendenze)
 */

(function () {
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCaloriesBarChart(container, series, targetKcal) {
    if (!container) return;
    if (!Array.isArray(series) || series.length === 0) {
      container.innerHTML = `<div class="chart-empty">Nessun dato disponibile</div>`;
      return;
    }

    const width = 380;
    const height = 196;
    const padLeft = 36;
    const padRight = 12;
    const padTop = 24;
    const padBottom = 34;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxData = Math.max(...series.map((d) => d.kcal || 0), targetKcal || 2000, 1200);
    const yMax = Math.ceil((maxData * 1.16) / 250) * 250;

    const yFor = (val) => padTop + plotH - Math.min(1, Math.max(0, val / yMax)) * plotH;
    const targetY = yFor(targetKcal || 2000);

    const n = series.length;
    const slotW = plotW / n;
    const barW = Math.min(26, Math.max(10, slotW * 0.58));

    const gridSteps = [0, Math.round(yMax * 0.5), yMax];
    const gridLines = gridSteps.map((gv) => {
      const gy = yFor(gv);
      return `
        <line x1="${padLeft}" y1="${gy.toFixed(1)}" x2="${width - padRight}" y2="${gy.toFixed(1)}"
              stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="${gv === 0 ? 'none' : '3 3'}" />
        <text x="${padLeft - 6}" y="${(gy + 3.5).toFixed(1)}" text-anchor="end"
              fill="var(--text-muted)" font-size="9.5" font-weight="500">${gv}</text>
      `;
    }).join('');

    const barsSvg = series.map((item, idx) => {
      const cx = padLeft + idx * slotW + slotW / 2;
      const x = cx - barW / 2;
      const val = Math.round(item.kcal || 0);
      const barH = val > 0 ? Math.max(5, (val / yMax) * plotH) : 4;
      const y = padTop + plotH - barH;

      let fill = 'var(--bar-empty)';
      if (val > 0) {
        if (val > (targetKcal || 2000) * 1.15) {
          fill = 'url(#barOverGrad)';
        } else if (val > (targetKcal || 2000) * 1.04) {
          fill = 'url(#barWarnGrad)';
        } else {
          fill = 'url(#barOkGrad)';
        }
      }

      const showValue = val > 0 && (n <= 7 || idx === n - 1 || item.isSelected || idx % 2 === 0);
      const showLabel = n <= 7 || idx % 2 === 0 || idx === n - 1;
      const labelWeight = item.isToday ? '700' : '500';
      const labelColor = item.isToday ? 'var(--accent-primary)' : 'var(--text-muted)';

      return `
        <g class="chart-bar-group" data-date="${escapeHtml(item.dateKey)}">
          <title>${escapeHtml(item.fullLabel || item.shortLabel)}: ${val} kcal</title>
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}"
                rx="${Math.min(6, barW / 2).toFixed(1)}" fill="${fill}" />
          ${showValue ? `
            <text x="${cx.toFixed(1)}" y="${Math.max(12, y - 5).toFixed(1)}" text-anchor="middle"
                  fill="var(--text-secondary)" font-size="${n > 7 ? '8.5' : '9.5'}" font-weight="600">${val}</text>
          ` : ''}
          ${showLabel ? `
            <text x="${cx.toFixed(1)}" y="${height - 11}" text-anchor="middle"
                  fill="${labelColor}" font-size="10" font-weight="${labelWeight}">${escapeHtml(item.shortLabel)}</text>
          ` : ''}
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="nutri-svg-chart" role="img" aria-label="Grafico calorie giornaliere">
        <defs>
          <linearGradient id="barOkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#34d399" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <linearGradient id="barWarnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <linearGradient id="barOverGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fb7185" />
            <stop offset="100%" stop-color="#e11d48" />
          </linearGradient>
        </defs>
        ${gridLines}
        <line x1="${padLeft}" y1="${targetY.toFixed(1)}" x2="${width - padRight}" y2="${targetY.toFixed(1)}"
              stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.85" />
        <text x="${width - padRight}" y="${Math.max(11, targetY - 4).toFixed(1)}" text-anchor="end"
              fill="#38bdf8" font-size="9" font-weight="600">Target ${Math.round(targetKcal || 2000)}</text>
        ${barsSvg}
      </svg>
    `;
  }

  function renderMacroDonut(container, avgMacros) {
    if (!container) return;
    const carbsG = Math.max(0, Number(avgMacros?.carbs) || 0);
    const proteinG = Math.max(0, Number(avgMacros?.protein) || 0);
    const fatG = Math.max(0, Number(avgMacros?.fat) || 0);

    const carbsKcal = carbsG * 4;
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const totalMacroKcal = carbsKcal + proteinKcal + fatKcal;

    if (totalMacroKcal <= 0) {
      container.innerHTML = `<div class="chart-empty">Registra almeno un pasto per visualizzare la ripartizione dei macronutrienti.</div>`;
      return;
    }

    const segments = [
      { key: 'carbs', label: 'Carboidrati', grams: carbsG, kcal: carbsKcal, color: '#38bdf8', pct: Math.round((carbsKcal / totalMacroKcal) * 100) },
      { key: 'protein', label: 'Proteine', grams: proteinG, kcal: proteinKcal, color: '#10b981', pct: Math.round((proteinKcal / totalMacroKcal) * 100) },
      { key: 'fat', label: 'Grassi', grams: fatG, kcal: fatKcal, color: '#f59e0b', pct: Math.max(0, 100 - Math.round((carbsKcal / totalMacroKcal) * 100) - Math.round((proteinKcal / totalMacroKcal) * 100)) }
    ];

    const r = 48;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    const circles = segments.map((seg) => {
      const frac = seg.kcal / totalMacroKcal;
      const dash = frac * circ;
      const svgSeg = `
        <circle cx="64" cy="64" r="${r}" fill="none" stroke="${seg.color}" stroke-width="16"
                stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}"
                stroke-dashoffset="${(-offset).toFixed(2)}"
                transform="rotate(-90 64 64)" />
      `;
      offset += dash;
      return svgSeg;
    }).join('');

    const legendItems = segments.map((seg) => `
      <div class="donut-legend-row">
        <span class="donut-dot" style="background:${seg.color}"></span>
        <div class="donut-legend-info">
          <div class="donut-legend-top">
            <span class="donut-legend-name">${seg.label}</span>
            <strong class="donut-legend-pct">${seg.pct}%</strong>
          </div>
          <div class="donut-legend-sub">${Math.round(seg.grams)} g/gg · ${Math.round(seg.kcal)} kcal</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="donut-layout">
        <div class="donut-svg-wrap">
          <svg viewBox="0 0 128 128" width="128" height="128" aria-label="Ripartizione macronutrienti">
            <circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--bar-empty)" stroke-width="16" />
            ${circles}
            <text x="64" y="60" text-anchor="middle" fill="var(--text-primary)" font-size="15" font-weight="800">${Math.round(totalMacroKcal)}</text>
            <text x="64" y="75" text-anchor="middle" fill="var(--text-muted)" font-size="9.5" font-weight="600">kcal media</text>
          </svg>
        </div>
        <div class="donut-legend">
          ${legendItems}
        </div>
      </div>
    `;
  }

  function renderWeightChart(container, weightLog, targetWeightKg) {
    if (!container) return;
    const entries = Array.isArray(weightLog) ? weightLog.slice(-12) : [];
    if (entries.length === 0) {
      container.innerHTML = `<div class="chart-empty">Nessuna pesata registrata. Inserisci il tuo peso qui sopra!</div>`;
      return;
    }

    const width = 380;
    const height = 176;
    const padLeft = 38;
    const padRight = 18;
    const padTop = 24;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const weights = entries.map((e) => Number(e.weightKg) || 0);
    const refList = targetWeightKg ? [...weights, Number(targetWeightKg)] : weights;
    const minW = Math.floor(Math.min(...refList) - 1.5);
    const maxW = Math.ceil(Math.max(...refList) + 1.5);
    const span = Math.max(2, maxW - minW);

    const xFor = (i) => entries.length === 1
      ? padLeft + plotW / 2
      : padLeft + (i / (entries.length - 1)) * plotW;
    const yFor = (w) => padTop + plotH - ((w - minW) / span) * plotH;

    const pts = entries.map((e, i) => ({
      x: xFor(i),
      y: yFor(e.weightKg),
      w: e.weightKg,
      date: e.date
    }));

    const linePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = pts.length > 1
      ? `M ${pts[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ` +
        pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') +
        ` L ${pts[pts.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

    const gridVals = [minW, Math.round((minW + maxW) * 5) / 10, maxW];
    const gridSvg = gridVals.map((gv) => {
      const gy = yFor(gv);
      return `
        <line x1="${padLeft}" y1="${gy.toFixed(1)}" x2="${width - padRight}" y2="${gy.toFixed(1)}"
              stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3" />
        <text x="${padLeft - 6}" y="${(gy + 3.5).toFixed(1)}" text-anchor="end"
              fill="var(--text-muted)" font-size="9.5">${gv}</text>
      `;
    }).join('');

    let targetLineSvg = '';
    if (targetWeightKg && targetWeightKg >= minW && targetWeightKg <= maxW) {
      const ty = yFor(targetWeightKg);
      targetLineSvg = `
        <line x1="${padLeft}" y1="${ty.toFixed(1)}" x2="${width - padRight}" y2="${ty.toFixed(1)}"
              stroke="#10b981" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.85" />
        <text x="${width - padRight}" y="${Math.max(11, ty - 4).toFixed(1)}" text-anchor="end"
              fill="#10b981" font-size="9" font-weight="600">Obiettivo ${targetWeightKg} kg</text>
      `;
    }

    const dotsSvg = pts.map((p, i) => {
      const isEdge = i === 0 || i === pts.length - 1 || pts.length <= 5;
      const dt = window.parseDateKey ? window.parseDateKey(p.date) : new Date(p.date);
      const shortDate = dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      const showDate = i === 0 || i === pts.length - 1 || (pts.length <= 6) || (i === Math.floor(pts.length / 2));

      return `
        <g>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.2" fill="#38bdf8" stroke="var(--bg-card)" stroke-width="2" />
          ${isEdge ? `
            <text x="${p.x.toFixed(1)}" y="${Math.max(12, p.y - 8).toFixed(1)}" text-anchor="middle"
                  fill="var(--text-primary)" font-size="9.5" font-weight="700">${p.w}</text>
          ` : ''}
          ${showDate ? `
            <text x="${p.x.toFixed(1)}" y="${height - 9}" text-anchor="middle"
                  fill="var(--text-muted)" font-size="9.5">${escapeHtml(shortDate)}</text>
          ` : ''}
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="nutri-svg-chart" role="img" aria-label="Andamento peso corporeo">
        <defs>
          <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridSvg}
        ${targetLineSvg}
        ${areaPath ? `<path d="${areaPath}" fill="url(#weightAreaGrad)" />` : ''}
        ${pts.length > 1 ? `<polyline points="${linePoints}" fill="none" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />` : ''}
        ${dotsSvg}
      </svg>
    `;
  }

  window.nutriCharts = {
    renderCaloriesBarChart,
    renderMacroDonut,
    renderWeightChart
  };
})();
