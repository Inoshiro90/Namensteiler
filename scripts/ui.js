'use strict';

// ─── TABLE ──────────────────────────────────────────────────────────
function initTable(classes) {
  const tbody = document.getElementById('classes-body');
  tbody.innerHTML = '';
  // Sortiere aufsteigend nach Sonoritätswert (1→13)
  const sorted = classes.slice().sort((a, b) => a.value - b.value);
  sorted.forEach((cls, idx) => tbody.appendChild(makeRow(cls, idx)));
  updateLegend();
}

function makeRow(cls, idx) {
  const tr = document.createElement('tr');
  const c = COLOURS[cls.value] || '#555';
  tr.innerHTML = `
    <td class="align-middle text-center" style="width:22px">
      <span class="d-inline-block rounded-circle" id="swatch-${idx}" style="width:10px;height:10px;background:${c}"></span>
    </td>
    <td style="width:58px">
      <input class="input-val form-control form-control-sm text-center font-monospace px-1"
             type="number" min="1" max="20" value="${cls.value}"
             oninput="syncSwatch(this,${idx})" onchange="updateLegend()">
    </td>
    <td style="min-width:170px">
      <input class="input-name form-control form-control-sm" type="text" value="${escapeAttr(cls.name)}">
    </td>
    <td>
      <input class="input-graphemes form-control form-control-sm font-monospace"
             type="text" value="${escapeAttr(cls.graphemes)}"
             placeholder="Grapheme, kommagetrennt">
    </td>
    <td style="width:36px">
      <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="removeRow(this)" title="Entfernen">
        <i class="bi bi-x-lg" style="font-size:.7rem"></i>
      </button>
    </td>`;
  return tr;
}

function syncSwatch(input, idx) {
  const sw = document.getElementById('swatch-' + idx);
  if (sw) sw.style.background = COLOURS[parseInt(input.value)] || '#555';
}
function addClassRow() {
  const tbody = document.getElementById('classes-body');
  tbody.appendChild(makeRow({ value:5, name:'Neue Klasse', graphemes:'' }, tbody.children.length));
  updateLegend();
}
function removeRow(btn) { btn.closest('tr').remove(); updateLegend(); }
function resetDefaults() { applyProfile(document.getElementById('profile-select').value); }

// ─── PROFILE ────────────────────────────────────────────────────────
// ─── CLUSTER CARD UI HELPERS ────────────────────────────────────────
let _clusterCardOpen = false;

function toggleClusterCard() {
  const body = document.getElementById('cluster-card-body');
  const chev = document.getElementById('cluster-chevron');
  _clusterCardOpen = !_clusterCardOpen;
  body.style.display = _clusterCardOpen ? '' : 'none';
  if (chev) chev.style.transform = _clusterCardOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
}

function buildClusterLegend() {
  const legend = document.getElementById('cluster-legend');
  if (!legend) return;
  const classes = readClasses();
  legend.innerHTML = classes.map(c => {
    const col = getComputedStyle(document.documentElement)
      .getPropertyValue('--cls-' + c.value) || '#888';
    return `<span class="badge" style="background:rgba(255,255,255,.08);color:#ccc;font-weight:400">
      <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${
        ['#e85','#d75','#c65','#b55','#a44','#963','#882','#771','#660','#550'][c.value-1] || '#888'
      };margin-right:3px"></span>${c.value} = ${c.name.replace('Stimmlose ','vl.').replace('Stimmhafte ','vd.').replace('Affrikate','Aff.').replace('Frikative','Frik.').replace('Plosive','Plos.').replace('Rhotische','Rhot.').replace('Laterale','Lat.').replace('Approximanten','Approx.').replace('Nasale','Nas.')}
    </span>`;
  }).join('');
}

function updateClusterCount() {
  const cl = readClusters();
  const total = cl.ao.length + cl.fo.length + cl.ac.length + cl.fc.length;
  const el = document.getElementById('cluster-count');
  if (el) el.textContent = total > 0 ? `${total} Regeln aktiv` : '';
}

function clearClusters() {
  ['cluster-ao','cluster-fo','cluster-ac','cluster-fc','cluster-fop'].forEach(id => {
    document.getElementById(id).value = '';
  });
  const _fopC = document.getElementById('cluster-fop'); if (_fopC) _fopC.value = '';
  const _moC = document.getElementById('max-onset'); if (_moC) _moC.value = '0';
  const _mcC = document.getElementById('max-coda');  if (_mcC) _mcC.value = '0';
  _forbiddenOnsetPairs = []; _maxOnsetLen = 0; _maxCodaLen = 0;
  updateCvBadge();
  const mo2=document.getElementById('max-onset'); if(mo2) mo2.value='';
  const mc2=document.getElementById('max-coda');  if(mc2) mc2.value='';
  updateCvStructureBadge();
  updateClusterCount();
  analyze();
}

function reloadProfileClusters() {
  document.getElementById('cluster-ao').value = patsToText(_allowedOnsets);
  document.getElementById('cluster-fo').value = patsToText(_forbiddenOnsets);
  document.getElementById('cluster-ac').value = patsToText(_allowedCodas);
  document.getElementById('cluster-fc').value = patsToText(_forbiddenCodas);
  const _fopR = document.getElementById('cluster-fop'); if (_fopR) _fopR.value = _forbiddenOnsetPairs.join(', ');
  const _moR = document.getElementById('max-onset'); if (_moR) _moR.value = _maxOnsetLength || _maxOnsetLen;
  const _mcR = document.getElementById('max-coda');  if (_mcR) _mcR.value = _maxCodaLength  || _maxCodaLen;
  document.getElementById('morpheme-prefixes').value = _morphemePrefixes.join('\n');
  document.getElementById('morpheme-infixes').value  = _morphemeInfixes.join('\n');
  document.getElementById('morpheme-suffixes').value = _morphemeSuffixes.join('\n');
  updateCvBadge();
  updateClusterCount();
  analyze();
}

// ─── RENDER CARD ─────────────────────────────────────────────────────
function renderWordCard(word, segments, boundaries) {
  const BAR_SCALE = parseInt(document.getElementById('bar-scale').value);
  const BAR_W     = parseInt(document.getElementById('bar-width').value);
  const CHART_H   = 13 * BAR_SCALE;
  const LABEL_H   = 22, VAL_H = 18, SVG_H = CHART_H + LABEL_H + VAL_H + 8;
  const SVG_W     = segments.length * BAR_W + 2;
  const vowelMin  = parseInt(document.getElementById('vowel-min').value);

  let sylWord = '';
  segments.forEach((seg, i) => {
    if (i > 0 && boundaries.has(i)) sylWord += '·';
    sylWord += seg.text;
  });
  const syllableCount = 1 + boundaries.size;

  let bars='', labels='', vals='', blines='';
  segments.forEach((seg, i) => {
    const x = i * BAR_W, v = seg.sonority;
    const c = COLOURS[v] || '#555';
    const barH = v > 0 ? Math.round(v * BAR_SCALE) : 4;
    const barY = CHART_H - barH;
    const isVowel = v >= vowelMin;
    if (i > 0 && boundaries.has(i))
      blines += `<line x1="${x}" y1="0" x2="${x}" y2="${CHART_H+LABEL_H+VAL_H}" stroke="#f06060" stroke-width="1.5" stroke-dasharray="4,3" opacity=".85"/>`;
    bars += `<rect x="${x+4}" y="${barY}" width="${BAR_W-8}" height="${barH}" fill="${c}" rx="3" opacity="${v===0?0.3:0.88}"><title>${seg.text} — ${seg.className} (${v})</title></rect>`;
    if (isVowel) bars += `<circle cx="${x+BAR_W/2}" cy="${barY-4}" r="3" fill="${c}" opacity=".6"/>`;
    if (v > 0)   vals += `<text x="${x+BAR_W/2}" y="${barY-8}" font-family="monospace" font-size="9" fill="${c}" text-anchor="middle" opacity=".9">${v}</text>`;
    const fs = seg.text.length<=2?13:seg.text.length<=3?11:9;
    labels += `<text x="${x+BAR_W/2}" y="${CHART_H+LABEL_H-4}" font-family="monospace" font-size="${fs}" font-weight="500" fill="${isVowel?c:'#ccc'}" text-anchor="middle">${escapeXml(seg.text)}</text>`;
  });

  const pts = segments.map((seg, i) => {
    const v = seg.sonority;
    return `${i*BAR_W+BAR_W/2},${CHART_H-(v>0?Math.round(v*BAR_SCALE):2)}`;
  }).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}">
    <line x1="0" y1="${CHART_H}" x2="${SVG_W}" y2="${CHART_H}" stroke="rgba(255,255,255,.1)" stroke-width="1"/>
    ${blines}${bars}
    <polyline points="${pts}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1.2" stroke-dasharray="3,2"/>
    ${vals}${labels}
  </svg>`;

  let tableRows='', syllIdx=1;
  segments.forEach((seg, i) => {
    if (i>0 && boundaries.has(i)) syllIdx++;
    const c = COLOURS[seg.sonority] || '#555';
    const isBnd = i>0 && boundaries.has(i);
    tableRows += `<tr>
      <td class="font-monospace fw-semibold" style="color:${c}">${isBnd?'<span class="is-boundary me-1">│</span>':''}${escapeHtml(seg.text)}</td>
      <td class="text-muted">${escapeHtml(seg.className)}</td>
      <td class="font-monospace" style="color:${c}">${seg.sonority||'—'}</td>
      <td class="text-muted font-monospace">${syllIdx}</td>
    </tr>`;
  });

  const card = document.createElement('div');
  card.className = 'card word-card';
  card.innerHTML = `
    <div class="word-card-header">
      <span class="word-original">${escapeHtml(word)}</span>
      <span class="word-syllabified">${escapeHtml(sylWord)}</span>
      <span class="word-info">${segments.length} Segm. · ${syllableCount} Silben</span>
    </div>
    <div class="word-card-body">
      <div class="chart-wrap mb-3">${svg}</div>
      <table class="table table-sm seg-table mb-0">
        <thead class="table-dark"><tr><th>Segment</th><th>Sonoritätsklasse</th><th>Wert</th><th>Silbe</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
  return card;
}

// ─── ANALYZE ────────────────────────────────────────────────────────
function analyze() {
  const raw = document.getElementById('words-input').value;
  const vowelMin = parseInt(document.getElementById('vowel-min').value) || 11;
  const gmap = buildGraphemeMap(readClasses());
  const words = raw.split(/[\n,]+/).flatMap(l => l.trim().split(/\s+/)).map(w => w.trim()).filter(w => w);
  if (!words.length) return;

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  const grid = document.createElement('div');

  words.forEach(word => {
    const parts = word.split('-');
    const allSegs = [], allBounds = new Set();
    let offset = 0;
    parts.forEach((part, pi) => {
      if (!part) return;
      const cl = readClusters();
      updateClusterCount();
      // Morphem-Split: Erkenne Komposita via Präfix/Infix/Suffix-Wörterbücher
      const subparts = splitByMorphemes(part);
      subparts.forEach((subpart, si) => {
        const segs = parseWord(subpart, gmap);
        const bounds = syllabify(segs, vowelMin, cl.ao, cl.fo, cl.ac, cl.fc, cl.fop, cl.mol, cl.mcl);
        if (pi > 0 && si === 0) allBounds.add(offset);
        if (si > 0) allBounds.add(offset); // Morphemgrenze als Silbengrenze
        bounds.forEach(b => allBounds.add(b + offset));
        segs.forEach(s => allSegs.push(s));
        offset += segs.length;
      });
    });
    grid.appendChild(renderWordCard(word, allSegs, allBounds));
  });

  resultsDiv.appendChild(grid);

  // ── Run full statistics after rendering individual word cards ──────
  runFullStats(words);
}

function clearResults() {
  const res = document.getElementById('results');
  res.style.display = '';
  res.innerHTML = `
    <div class="empty-state">
      <span class="empty-state-icon">◌</span>
      Namen eingeben und auf <strong>Analysieren</strong> klicken
    </div>`;
  const chev = document.getElementById('chev-results');
  if (chev) chev.style.transform = 'rotate(0deg)';
  const sa = document.getElementById('stats-area');
  if (sa) sa.style.display = 'none';
  _lastStatsResult = null;
}

// ─── EXAMPLES ───────────────────────────────────────────────────────
let exampleIdx = 0;
const EXAMPLES_LIST = Object.values(HINTS);
function loadExample() {
  document.getElementById('words-input').value = EXAMPLES_LIST[exampleIdx++ % EXAMPLES_LIST.length];
  analyze();
}

// ─── LEGEND ─────────────────────────────────────────────────────────
function updateLegend() {
  document.getElementById('legend').innerHTML = readClasses().map(cls => {
    const c = COLOURS[cls.value] || '#555';
    return `<div class="d-flex align-items-center gap-2 mb-1">
      <span class="d-inline-block rounded-circle flex-shrink-0" style="width:9px;height:9px;background:${c}"></span>
      <span class="text-muted small">${escapeHtml(cls.name)}</span>
      <span class="badge rounded-pill ms-auto font-monospace" style="background:${c};font-size:.65rem">${cls.value}</span>
    </div>`;
  }).join('');
}

// ─── UTILS ──────────────────────────────────────────────────────────
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeXml(s)  { return escapeHtml(s).replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
function escapeAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

// ─── EXPORT / IMPORT ────────────────────────────────────────────────
function exportProfile() {
  const profileSelect = document.getElementById('profile-select');
  const profileId   = profileSelect ? profileSelect.value : 'custom';
  const profileName = profileSelect ? profileSelect.options[profileSelect.selectedIndex].text.trim() : 'Benutzerdefiniert';

  const classes  = readClasses();
  const cl       = readClusters();
  const vowelMin = parseInt(document.getElementById('vowel-min').value) || 11;

  const data = {
    _silbenteilerExport: true,
    _version: 2,
    profileId,
    profileName,
    vowelMin,
    classes: classes.map(c => ({ value: c.value, name: c.name, graphemes: c.graphemes })),
    allowedOnsets:         cl.ao,
    forbiddenOnsets:       cl.fo,
    allowedCodas:          cl.ac,
    forbiddenCodas:        cl.fc,
    forbiddenOnsetPairs:   readFopField(),
    maxOnsetLen:           readMaxOnsetField(),
    maxCodaLen:            readMaxCodaField(),
    morphemePrefixes: readMorphemeList('morpheme-prefixes'),
    morphemeInfixes:  readMorphemeList('morpheme-infixes'),
    morphemeSuffixes: readMorphemeList('morpheme-suffixes'),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const safeName = profileName.replace(/[^\w\-äöüÄÖÜ]/g, '_').replace(/__+/g,'_').toLowerCase();
  a.href = url;
  a.download = `silbenteiler_${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProfile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch { return alert('Ungültige JSON-Datei.'); }

    if (!data._silbenteilerExport) {
      return alert('Dies ist keine gültige Silbenteiler-Exportdatei.');
    }

    // Apply classes
    if (Array.isArray(data.classes) && data.classes.length > 0) {
      initTable(data.classes);
    }
    // Apply cluster constraints
    const p2t = p => (p || []).map(row => Array.isArray(row) ? row.join('+') : row).join(', ');
    document.getElementById('cluster-ao').value = p2t(data.allowedOnsets   || []);
    document.getElementById('cluster-fo').value = p2t(data.forbiddenOnsets || []);
    document.getElementById('cluster-ac').value = p2t(data.allowedCodas    || []);
    document.getElementById('cluster-fc').value = p2t(data.forbiddenCodas  || []);
    // Apply morpheme lists (v2 has all 3; v1 only had morphemePrefixes)
    _forbiddenOnsetPairs = data.forbiddenOnsetPairs || [];
    _maxOnsetLen = data.maxOnsetLen || 0;
    _maxCodaLen  = data.maxCodaLen  || 0;
    const _fopI = document.getElementById('cluster-fop'); if (_fopI) _fopI.value = _forbiddenOnsetPairs.join(', ');
    const _moI = document.getElementById('max-onset'); if (_moI) _moI.value = _maxOnsetLen;
    const _mcI = document.getElementById('max-coda');  if (_mcI) _mcI.value = _maxCodaLen;
    updateCvBadge();
    document.getElementById('morpheme-prefixes').value = (data.morphemePrefixes || []).join('\n');
    document.getElementById('morpheme-infixes').value  = (data.morphemeInfixes  || []).join('\n');
    document.getElementById('morpheme-suffixes').value = (data.morphemeSuffixes  || []).join('\n');
    // Apply vowelMin
    if (data.vowelMin) {
      const vm = document.getElementById('vowel-min');
      if (vm) vm.value = data.vowelMin;
    }
    // Update UI
    updateClusterCount();
    buildClusterLegend();
    updateLegend();
    analyze();

    // Show confirmation toast
    showImportToast(data.profileName || 'Profil');
  };
  reader.readAsText(file);
  // Reset so same file can be re-imported
  input.value = '';
}

function showImportToast(name) {
  // Simple inline notification
  let toast = document.getElementById('import-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'import-toast';
    toast.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'right:1.5rem', 'z-index:9999',
      'background:#1e3a2e', 'border:1px solid #2d6a4a', 'color:#6fcf97',
      'padding:.6rem 1.1rem', 'border-radius:.5rem', 'font-size:.82rem',
      'box-shadow:0 4px 20px rgba(0,0,0,.4)', 'transition:opacity .4s',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="bi bi-check-circle me-2"></i>Profil <strong>${escapeHtml(name)}</strong> importiert`;
  toast.style.opacity = '1';
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') analyze(); });

// ─── SECTION TOGGLE ─────────────────────────────────────────────────
function toggleSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const suffix = id.replace('sec-','');
  const chev = document.getElementById('chev-' + suffix);
  const open = el.style.display === 'none' || el.style.display === '';
  el.style.display = open ? 'block' : 'none';
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
}

// Sidebar cards & results panel toggle (chevron rotates -90° when closed)
function toggleRightCard(bodyId, chevId) {
  const body = document.getElementById(bodyId);
  const chev = document.getElementById(chevId);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  if (chev) chev.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
}
