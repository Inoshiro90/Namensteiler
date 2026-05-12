'use strict';

// ─── STATISTICS COLLECTION ──────────────────────────────────────────
let _lastStatsResult = null;

// ── 1. Length distribution ──────────────────────────────────────────
function calcLengthDist(names) {
  const counts = {}, total = names.length;
  names.forEach(n => { counts[n.length] = (counts[n.length] || 0) + 1; });
  return Object.keys(counts).map(k => ({
    length: Number(k),
    count: counts[k],
    probability: Number(((counts[k] / total) * 100).toFixed(2))
  })).sort((a, b) => a.length - b.length);
}

// ── 2. CV patterns per length ────────────────────────────────────────
function calcCVPatterns(names, gmap, vowelMin) {
  const groups = {};
  names.forEach(name => {
    const segs = parseWord(name, gmap);
    const pattern = segsToCVPattern(segs, vowelMin, gmap);
    const len = name.length;
    if (!groups[len]) groups[len] = { total: 0, counts: {} };
    groups[len].total++;
    groups[len].counts[pattern] = (groups[len].counts[pattern] || 0) + 1;
  });
  return Object.keys(groups).map(k => {
    const len = Number(k), total = groups[k].total, counts = groups[k].counts;
    const probs = {};
    Object.keys(counts).forEach(p => { probs[p] = Number(((counts[p] / total) * 100).toFixed(2)); });
    const sorted = Object.fromEntries(Object.entries(probs).sort((a,b) => b[1]-a[1]));
    return { length: len, total, patterns: sorted };
  }).sort((a,b) => a.length - b.length);
}

// ── 3. Vowel & consonant run combinations ───────────────────────────
// For each grapheme-segment, iterate over every individual character and look it
// up as a single-char entry in the grapheme map. This ensures multi-char graphemes
// like 'sch' → CCC, 'au' → VV, 'ya' → VV (if y=vowel) or CV (if y=approx).
function segsToCVPattern(segs, vowelMin, gmap) {
  let pattern = '';
  for (const seg of segs) {
    for (const ch of seg.text.toLowerCase()) {
      const son = (gmap && gmap.map && gmap.map[ch] !== undefined) ? gmap.map[ch] : 0;
      pattern += son >= vowelMin ? 'V' : 'C';
    }
  }
  return pattern;
}

function calcLetterCombos(names, gmap, vowelMin) {
  const vGroups = {}, cGroups = {};

  names.forEach(rawName => {
    const segs = parseWord(rawName, gmap);
    const n = segs.length;
    let run = [], runIsVowel = null, runStart = -1;
    const seenV = new Set(), seenC = new Set();

    const flushRun = () => {
      if (!run.length) return;
      const key    = run.map(s => s.text).join('').toLowerCase();
      const cvPat  = segsToCVPattern(run, vowelMin, gmap);
      const runEnd = runStart + run.length - 1;
      const befIsVow = runStart > 0 ? segs[runStart-1].sonority >= vowelMin : null;
      const aftIsVow = runEnd < n-1  ? segs[runEnd+1].sonority  >= vowelMin : null;
      let posType = null;
      if (runStart === 0 && runEnd < n-1) {
        if (!runIsVowel && aftIsVow === true)  posType = 'prefix';
        if (runIsVowel  && aftIsVow === false) posType = 'prefix';
      } else if (runEnd === n-1 && runStart > 0) {
        if (!runIsVowel && befIsVow === true)  posType = 'suffix';
        if (runIsVowel  && befIsVow === false) posType = 'suffix';
      } else if (runStart > 0 && runEnd < n-1) {
        if (!runIsVowel && befIsVow === true  && aftIsVow === true)  posType = 'infix';
        if (runIsVowel  && befIsVow === false && aftIsVow === false) posType = 'infix';
      }
      if (posType) {
        const groups = runIsVowel ? vGroups : cGroups;
        const seen   = runIsVowel ? seenV   : seenC;
        const len    = run.length;
        const sk     = `${key}|${posType}`;
        if (!seen.has(sk)) {
          seen.add(sk);
          if (!groups[len]) groups[len] = { total: 0, counts: {} };
          if (!groups[len].counts[key]) groups[len].counts[key] = { total: 0, cvPattern: cvPat, positions: { prefix:0, infix:0, suffix:0 } };
          groups[len].counts[key].total++;
          groups[len].counts[key].positions[posType]++;
          groups[len].total++;
        }
      }
      run = []; runIsVowel = null; runStart = -1;
    };

    segs.forEach((seg, idx) => {
      const isV = seg.sonority >= vowelMin;
      if (runIsVowel === null) { runIsVowel = isV; run = [seg]; runStart = idx; }
      else if (isV === runIsVowel) { run.push(seg); }
      else { flushRun(); runIsVowel = isV; run = [seg]; runStart = idx; }
    });
    flushRun();
  });

  const makeResult = (groups) => {
    const posNames = ['prefix','infix','suffix'];
    const totals = { prefix:0, infix:0, suffix:0 };
    Object.values(groups).forEach(g => {
      Object.values(g.counts).forEach(c => {
        posNames.forEach(p => { totals[p] += c.positions[p] || 0; });
      });
    });
    const out = { prefix:{}, infix:{}, suffix:{} };
    Object.keys(groups).forEach(len => {
      const g = groups[len];
      // per-position totals for this length
      const lenPosTotals = { prefix:0, infix:0, suffix:0 };
      Object.values(g.counts).forEach(c => {
        posNames.forEach(p => { lenPosTotals[p] += c.positions[p] || 0; });
      });
      Object.keys(g.counts).forEach(pat => {
        const c = g.counts[pat];
        posNames.forEach(pos => {
          const cnt = c.positions[pos] || 0;
          if (!cnt) return;
          if (!out[pos][len]) out[pos][len] = {};
          out[pos][len][pat] = {
            cvPattern:    c.cvPattern || '',
            count:        cnt,
            probByLength: lenPosTotals[pos] > 0 ? Number(((cnt/lenPosTotals[pos])*100).toFixed(2)) : 0,
            probOverall:  totals[pos]         > 0 ? Number(((cnt/totals[pos])*100).toFixed(2))      : 0
          };
        });
      });
    });
    posNames.forEach(pos => {
      Object.keys(out[pos]).forEach(len => {
        out[pos][len] = Object.fromEntries(
          Object.entries(out[pos][len]).sort((a,b) => b[1].probOverall-a[1].probOverall)
        );
      });
    });
    return out;
  };
  return { vowels: makeResult(vGroups), consonants: makeResult(cGroups) };
}

// ── 4. Syllable statistics — grouped by length, with cvPattern & probByLength ──
function calcSyllableStats(names, gmap, vowelMin, cl) {
  // Structure: pre[len][syl] = count, same for inf, suf
  const pre = {}, inf = {}, suf = {};
  const totals = { pre:0, inf:0, suf:0 };

  // Helper: compute CV pattern for a syllable string via gmap
  const sylToCVPattern = (sylText) => {
    const segs = parseWord(sylText, gmap);
    return segsToCVPattern(segs, vowelMin, gmap);
  };

  names.forEach(word => {
    // ── Use the central resolver so manual overrides are honoured ─────
    // resolveWordBoundaries() is defined in ui.js (loaded before stats.js)
    // and already applies manualHyphenations + morpheme splitting.
    const { segments: allSegs, boundaries: allBounds } = resolveWordBoundaries(word, gmap, vowelMin, cl);
    const sylBounds = [0, ...[...allBounds].sort((a,b)=>a-b), allSegs.length];
    const syllables = [];
    for (let i = 0; i < sylBounds.length - 1; i++) {
      const s = allSegs.slice(sylBounds[i], sylBounds[i+1]).map(s => s.text).join('').toLowerCase();
      if (s) syllables.push(s);
    }
    const numSyl = syllables.length;
    if (!numSyl) return;

    syllables.forEach((syl, idx) => {
      const len = syl.length;
      const isFirst = idx === 0, isLast = idx === numSyl - 1;

      const add = (bucket) => {
        if (!bucket[len]) bucket[len] = {};
        bucket[len][syl] = (bucket[len][syl] || 0) + 1;
      };

      if (isFirst)               { add(pre); totals.pre++; }
      if (isLast && numSyl > 1)  { add(suf); totals.suf++; }
      if (numSyl === 1)          { add(suf); totals.suf++; } // single-syllable = also suffix
      if (!isFirst && !isLast)   { add(inf); totals.inf++; }
    });
  });

  // Convert raw count maps → enriched output grouped by length
  const buildOutput = (bucket, totalOverall) => {
    const out = {};
    Object.keys(bucket).map(Number).sort((a,b)=>a-b).forEach(len => {
      const entries = bucket[len]; // syl -> count
      const lenTotal = Object.values(entries).reduce((s,c)=>s+c, 0);
      out[String(len)] = Object.fromEntries(
        Object.entries(entries)
          .sort((a,b) => b[1] - a[1])
          .map(([syl, cnt]) => [syl, {
            cvPattern:    sylToCVPattern(syl),
            count:        cnt,
            probByLength: lenTotal > 0 ? Number(((cnt/lenTotal)*100).toFixed(2)) : 0,
            probOverall:  totalOverall > 0 ? Number(((cnt/totalOverall)*100).toFixed(2)) : 0
          }])
      );
    });
    return out;
  };

  return {
    prefix: buildOutput(pre, totals.pre),
    infix:  buildOutput(inf, totals.inf),
    suffix: buildOutput(suf, totals.suf)
  };
}

// ── Build + run full statistics ──────────────────────────────────────
function runFullStats(words) {
  const vowelMin  = parseInt(document.getElementById('vowel-min').value) || 11;
  const gmap      = buildGraphemeMap(readClasses());
  const cl        = readClusters();
  const profileEl = document.getElementById('profile-select');
  const profileId = profileEl ? profileEl.value : 'custom';

  const lengthDist    = calcLengthDist(words);
  const cvPatterns    = calcCVPatterns(words, gmap, vowelMin);
  const letterCombos  = calcLetterCombos(words, gmap, vowelMin);
  const syllableStats = calcSyllableStats(words, gmap, vowelMin, cl);

  _lastStatsResult = {
    _version: 1, profile: profileId, nameCount: words.length, names: words,
    nameLengths: Object.fromEntries(lengthDist.map(it => [String(it.length), { count: it.count, probability: it.probability }])),
    cvPatterns:  Object.fromEntries(cvPatterns.map(it => [String(it.length), { total: it.total, patterns: it.patterns }])),
    vowelCombinations: letterCombos.vowels,
    consonantCombinations: letterCombos.consonants,
    syllables: syllableStats
  };

  document.getElementById('json-output').textContent = JSON.stringify(_lastStatsResult, null, 2);
  renderLengthTable(lengthDist);
  renderCVTable(cvPatterns);
  renderComboTable('tbl-vowels', letterCombos.vowels);
  renderComboTable('tbl-cons',   letterCombos.consonants);
  renderSyllableTable('tbl-syl-pre', syllableStats.prefix);
  renderSyllableTable('tbl-syl-in',  syllableStats.infix);
  renderSyllableTable('tbl-syl-suf', syllableStats.suffix);
  document.getElementById('stats-area').style.display = 'block';
}

// ── Table renderers ──────────────────────────────────────────────────
function makeStatsTable(headers, rows) {
  const t = document.createElement('table');
  t.className = 'table table-sm table-hover mb-0';
  t.style.fontSize = '.75rem';
  const thead = document.createElement('thead');
  thead.className = 'table-dark';
  thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  t.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = r.map(c => `<td>${c}</td>`).join('');
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);
  return t;
}

// Table with copy-as-TSV button
function makeCopyTable(copyId, headers, rows) {
  const wrap = document.createElement('div');
  const btnWrap = document.createElement('div');
  btnWrap.className = 'mb-2 d-flex gap-2 flex-wrap';
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-secondary';
  btn.id = copyId;
  btn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Tabelle kopieren';
  btn.onclick = () => copyTableTSV(headers, rows, btn);
  btnWrap.appendChild(btn);
  wrap.appendChild(btnWrap);
  wrap.appendChild(makeStatsTable(headers, rows));
  return wrap;
}

function copyTableTSV(headers, rows, btn) {
  const plainHeaders = headers.map(h => h.replace(/<[^>]+>/g, ''));
  const plainRows    = rows.map(r => r.map(c => String(c).replace(/<[^>]+>/g, '')));
  const tsv = [plainHeaders, ...plainRows].map(r => r.join('\t')).join('\n');
  const copy = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => _flashBtn(btn)).catch(() => _tsvFallback(text, btn));
    } else _tsvFallback(text, btn);
  };
  copy(tsv);
}
function _tsvFallback(text, btn) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); _flashBtn(btn); } catch(e){}
  document.body.removeChild(ta);
}
function _flashBtn(btn) {
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Kopiert!';
  btn.classList.replace('btn-outline-secondary','btn-success');
  setTimeout(() => { btn.innerHTML = orig; btn.classList.replace('btn-success','btn-outline-secondary'); }, 1800);
}

function renderLengthTable(dist) {
  const el = document.getElementById('tbl-lengths'); el.innerHTML = '';
  el.appendChild(makeCopyTable('tbl-lengths-copy',
    ['Länge', 'Anzahl', 'Warscheinlichkeit (%)'],
    dist.map(d => [d.length, d.count, d.probability.toFixed(2).replace('.',',')])
  ));
}

function renderCVTable(cvPatterns) {
  const el = document.getElementById('tbl-cv'); el.innerHTML = '';
  const rows = [];
  cvPatterns.forEach(item => {
    Object.entries(item.patterns).forEach(([pat, prob]) => {
      rows.push([item.length, `<code>${escapeHtml(pat)}</code>`, prob.toFixed(2).replace('.',',')]);
    });
  });
  el.appendChild(makeCopyTable('tbl-cv-copy', ['Länge', 'CV-Muster', 'Warscheinlichkeit (%)'], rows));
}

function renderComboTable(containerId, combosByPos) {
  const el = document.getElementById(containerId); el.innerHTML = '';
  const posLabel = { prefix:'Präfix', infix:'Infix', suffix:'Suffix' };
  const rows = [];
  ['prefix','infix','suffix'].forEach(pos => {
    const byLen = combosByPos[pos] || {};
    const lengths = Object.keys(byLen).map(Number).sort((a,b)=>a-b);
    lengths.forEach(len => {
      Object.entries(byLen[String(len)]).forEach(([k,v]) => {
        rows.push([
          len,
          posLabel[pos],
          `<code>${escapeHtml(k)}</code>`,
          `<code class="text-muted">${escapeHtml(v.cvPattern||'')}</code>`,
          v.count,
          v.probByLength.toFixed(2).replace('.',','),
          v.probOverall.toFixed(2).replace('.',',')
        ]);
      });
    });
  });
  if (!rows.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Daten.</p>'; return; }
  el.appendChild(makeCopyTable(containerId+'-copy',
    ['Länge', 'Position', 'Kombination', 'CV-Muster', 'Anzahl', 'Warscheinlichkeit pro Länge (%)', 'Warscheinlichkeit gesamt (%)'],
    rows));
}

function renderSyllableTable(containerId, sylByLen) {
  const el = document.getElementById(containerId); el.innerHTML = '';
  const lengths = Object.keys(sylByLen).map(Number).sort((a,b)=>a-b);
  if (!lengths.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Silben gefunden.</p>'; return; }
  const rows = [];
  lengths.forEach(len => {
    Object.entries(sylByLen[String(len)]).forEach(([k,v]) => {
      rows.push([
        len,
        `<strong>${escapeHtml(k)}</strong>`,
        `<code class="text-muted">${escapeHtml(v.cvPattern||'')}</code>`,
        v.count,
        v.probByLength.toFixed(2).replace('.',','),
        v.probOverall.toFixed(2).replace('.',',')
      ]);
    });
  });
  el.appendChild(makeCopyTable(containerId+'-copy',
    ['Länge', 'Silbe', 'CV-Muster', 'Anzahl', 'Warscheinlichkeit pro Länge (%)', 'Warscheinlichkeit gesamt (%)'],
    rows));
}

function copyJSON() {
  const text = document.getElementById('json-output').textContent;
  if (!text) return;
  // Modern API with fallback
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      _showCopyFeedback();
    }).catch(() => _copyFallback(text));
  } else {
    _copyFallback(text);
  }
}
function _copyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); _showCopyFeedback(); } catch(e) {}
  document.body.removeChild(ta);
}
function _showCopyFeedback() {
  const btn = document.querySelector('[onclick="copyJSON()"]');
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Kopiert!';
  btn.classList.replace('btn-outline-primary','btn-success');
  setTimeout(() => { btn.innerHTML = orig; btn.classList.replace('btn-success','btn-outline-primary'); }, 1800);
}

function exportUnifiedJSON() {
  if (!_lastStatsResult) return;
  const json = JSON.stringify(_lastStatsResult, null, 2);
  const blob = new Blob([json], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `namensteiler_${(_lastStatsResult.profile||'analyse')}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── INIT ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  // Cluster-Phonotaktik-Karte standardmäßig einklappen
  const ccb = document.getElementById('cluster-card-body');
  if (ccb) ccb.style.display = 'none';
  const chev = document.getElementById('cluster-chevron');
  if (chev) chev.style.transform = 'rotate(-90deg)';

  // Standardprofil aus JSON laden und anwenden
  const sel = document.getElementById('profile-select');
  await applyProfile(sel ? sel.value : 'universal');
  buildClusterLegend();
});
