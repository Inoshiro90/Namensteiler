'use strict';

// ─── CLUSTER CONSTRAINT GLOBALS ──────────────────────────────────────
// Active cluster constraints (set by applyProfile, can be overridden by user)
let _allowedOnsets   = [];
let _forbiddenOnsets = [];
let _allowedCodas    = [];
let _forbiddenCodas  = [];
let _morphemePrefixes = [];
let _morphemeInfixes  = [];
let _morphemeSuffixes = [];
let _forbiddenOnsetPairs = [];  // Homorgane Onsets (graphembasiert)
let _maxOnsetLength = 3;
let _maxCodaLength  = 3;
let _maxOnsetLen = 0;  // 0 = unbegrenzt
let _maxCodaLen  = 0;  // 0 = unbegrenzt

function readFopField() {
  const el = document.getElementById('cluster-fop');
  if (!el || !el.value.trim()) return _forbiddenOnsetPairs;
  return el.value.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
}
function readMaxOnsetField() {
  const el = document.getElementById('max-onset');
  return el ? (parseInt(el.value) || 0) : (_maxOnsetLen || 0);
}
function readMaxCodaField() {
  const el = document.getElementById('max-coda');
  return el ? (parseInt(el.value) || 0) : (_maxCodaLen || 0);
}
function updateCvBadge() {
  const mo = readMaxOnsetField(), mc = readMaxCodaField();
  const badge = document.getElementById('cv-structure-badge');
  if (!badge) return;
  const o = mo > 0 ? '(' + 'C'.repeat(Math.min(mo,4)) + (mo>4?'+':'') + ')' : '';
  const c = mc > 0 ? '(' + 'C'.repeat(Math.min(mc,4)) + (mc>4?'+':'') + ')' : '';
  badge.textContent = o + 'V' + c;
}

function patsToText(pats) {
  return (pats || []).map(p => Array.isArray(p) ? p.join('+') : p).join(', ');
}

function textToPats(text) {
  return text.split(',').map(s => s.trim()).filter(s => s)
    .map(s => s.split('+').map(v => parseInt(v.trim())).filter(v => !isNaN(v)))
    .filter(p => p.length > 0);
}

function readClusters() {
  return {
    ao: textToPats(document.getElementById('cluster-ao').value),
    fo: textToPats(document.getElementById('cluster-fo').value),
    ac: textToPats(document.getElementById('cluster-ac').value),
    fc: textToPats(document.getElementById('cluster-fc').value),
    fop: readFopField(),
    mol: readMaxOnsetField(),
    mcl: readMaxCodaField(),
  };
}

function applyProfile(profileId) {
  const profile = PROFILES.find(p => p.id === profileId);
  if (!profile) return;
  // Load cluster constraints from profile into UI fields
  _allowedOnsets    = profile.allowedOnsets    || [];
  _forbiddenOnsets  = profile.forbiddenOnsets  || [];
  _allowedCodas     = profile.allowedCodas     || [];
  _forbiddenCodas   = profile.forbiddenCodas   || [];
  _morphemePrefixes = profile.morphemePrefixes || [];
  _morphemeInfixes  = profile.morphemeInfixes  || [];
  _morphemeSuffixes = profile.morphemeSuffixes || [];
  _forbiddenOnsetPairs = profile.forbiddenOnsetPairs || [];
  _maxOnsetLen = profile.maxOnsetLength || profile.maxOnsetLen || 0;
  _maxCodaLen  = profile.maxCodaLength  || profile.maxCodaLen  || 0;
  const _fopEl = document.getElementById('cluster-fop'); if (_fopEl) _fopEl.value = _forbiddenOnsetPairs.join(', ');
  const _moEl = document.getElementById('max-onset'); if (_moEl) _moEl.value = _maxOnsetLen;
  const _mcEl = document.getElementById('max-coda');  if (_mcEl) _mcEl.value = _maxCodaLen;
  updateCvBadge();
  document.getElementById('cluster-ao').value = patsToText(_allowedOnsets);
  document.getElementById('cluster-fo').value = patsToText(_forbiddenOnsets);
  document.getElementById('cluster-ac').value = patsToText(_allowedCodas);
  document.getElementById('cluster-fc').value = patsToText(_forbiddenCodas);
  document.getElementById('morpheme-prefixes').value = _morphemePrefixes.join('\n');
  document.getElementById('morpheme-infixes').value  = _morphemeInfixes.join('\n');
  document.getElementById('morpheme-suffixes').value = _morphemeSuffixes.join('\n');
  initTable(profile.classes);
  document.getElementById('profile-desc').textContent = profile.desc;
  const hint = HINTS[profileId] || HINTS['universal'];
  document.getElementById('words-input').value = hint;
  analyze();
}

// ─── READ CLASSES ────────────────────────────────────────────────────
function readClasses() {
  return [...document.querySelectorAll('#classes-body tr')].map(tr => ({
    value: parseInt(tr.querySelector('.input-val').value) || 5,
    name: tr.querySelector('.input-name').value.trim(),
    graphemes: tr.querySelector('.input-graphemes').value
      .split(',').map(g => g.trim().toLowerCase()).filter(g => g),
  }));
}

// ─── GRAPHEME MAP ────────────────────────────────────────────────────
function buildGraphemeMap(classes) {
  const map = {}, classMap = {};
  classes.forEach(cls => cls.graphemes.forEach(g => {
    if (g && !map[g]) { map[g] = cls.value; classMap[g] = cls.name; }
  }));
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length || a.localeCompare(b));
  return { map, classMap, sorted };
}

// ─── MORPHEME SPLIT ─────────────────────────────────────────────────
// Liest ein Morphem-Textarea-Feld (id) und gibt bereinigte Einträge zurück
function readMorphemeList(id) {
  const ta = document.getElementById(id);
  if (!ta) return [];
  return ta.value.split('\n').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
}

// Rückwärtskompatibel: liest Präfix-Feld (altes API)
function readMorphemePrefixes() { return readMorphemeList('morpheme-prefixes'); }

// Findet alle Morphem-Grenzen im Wort (Präfix → nach, Infix → vor+nach, Suffix → vor)
// Gibt sortiertes Array von Splitpositionen zurück, oder [] wenn keine Treffer
function morphemeSegment(word, prefixes, infixes, suffixes) {
  const lower = word.toLowerCase();
  const bounds = new Set();
  const MIN_REST = 2; // Mindestlänge des verbleibenden Restes

  // ── PRÄFIXE: Grenze direkt nach dem Präfix ─────────────────────
  const sortedPfx = [...prefixes].sort((a, b) => b.length - a.length);
  for (const pfx of sortedPfx) {
    if (lower.startsWith(pfx) && lower.length > pfx.length + MIN_REST) {
      bounds.add(pfx.length);
      break; // nur längster Treffer
    }
  }

  // ── SUFFIXE: Grenze direkt vor dem Suffix ──────────────────────
  const sortedSfx = [...suffixes].sort((a, b) => b.length - a.length);
  for (const sfx of sortedSfx) {
    const splitAt = lower.length - sfx.length;
    if (splitAt > MIN_REST && lower.endsWith(sfx)) {
      // Nur hinzufügen wenn nicht schon durch Präfix abgedeckt
      if (!bounds.has(splitAt)) bounds.add(splitAt);
      break;
    }
  }

  // ── INFIXE: Grenze vor + nach dem Infix ───────────────────────
  const sortedIfx = [...infixes].sort((a, b) => b.length - a.length);
  for (const ifx of sortedIfx) {
    const pos = lower.indexOf(ifx);
    if (pos > MIN_REST && pos + ifx.length < lower.length - MIN_REST) {
      bounds.add(pos);
      bounds.add(pos + ifx.length);
      break;
    }
  }

  return [...bounds].sort((a, b) => a - b);
}

// Zerlegt ein Wort anhand aller Morphemgrenzen in Teilwörter
function splitByMorphemes(word) {
  const prefixes = readMorphemeList('morpheme-prefixes');
  const infixes  = readMorphemeList('morpheme-infixes');
  const suffixes = readMorphemeList('morpheme-suffixes');
  if (!prefixes.length && !infixes.length && !suffixes.length) return [word];
  const bounds = morphemeSegment(word, prefixes, infixes, suffixes);
  if (!bounds.length) return [word];
  const parts = [];
  let prev = 0;
  for (const b of bounds) { parts.push(word.slice(prev, b)); prev = b; }
  parts.push(word.slice(prev));
  return parts.filter(p => p.length > 0);
}

// ─── PARSE ──────────────────────────────────────────────────────────
// Hiatus-Konstanten fuer ie-Diphthong-Pruefung
const _IE_SONORANTS = new Set('lrnm');
const _IE_VOWELS    = new Set('aeiouäöüáàâéèêíìîóòôúùûýæœ');

function parseWord(word, gmap) {
  const { map, classMap, sorted } = gmap;
  const lower = word.replace(/İ/g, 'I').toLowerCase();
  const segments = [];
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    for (const g of sorted) {
      if (lower.slice(i, i + g.length) === g) {
        // Glide-Digraph-Lookahead: we/wo/ye/yo nicht matchen, wenn das
        // Vokal-Teil ein längeres Graphem beginnt (z. B. "we" vor "ei" → w+ei)
        if ((g==='we'||g==='wo'||g==='ye'||g==='yo') && g.length===2) {
          const afterGlide = i + 1;
          let blocked = false;
          for (const g2 of sorted) {
            if (g2.length >= 2 && lower.slice(afterGlide, afterGlide + g2.length) === g2) {
              blocked = true; break;
            }
          }
          if (blocked) continue;
        }
        // Steigender-Diphthong-Hiatus-Check fuer 'ie'
        if (g === 'ie') {
          const nc  = i + 2 < lower.length ? lower[i + 2] : '';
          const nnc = i + 3 < lower.length ? lower[i + 3] : '';
          if (_IE_SONORANTS.has(nc) && (nnc === '' || _IE_VOWELS.has(nnc))) {
            continue;  // 'ie' ueberspringen -> i + e werden einzeln gematcht
          }
        }
        // Geminate auto-split: CONSONANT geminates only (sonority < 11)
        // Vowel digraphs like aa/ee/oo/uu/ii keep their long-vowel identity
        if (g.length === 2 && g[0] === g[1] && map[g] < 11) {
          const son = map[g], cls = classMap[g];
          segments.push({ text: word.slice(i,     i+1), grapheme: g[0], sonority: son, className: cls });
          segments.push({ text: word.slice(i+1, i+2), grapheme: g[0], sonority: son, className: cls });
        } else {
          segments.push({ text: word.slice(i, i+g.length), grapheme: g, sonority: map[g], className: classMap[g] });
        }
        i += g.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = word[i];
      segments.push({ text: ch, grapheme: ch.toLowerCase(), sonority: 0, className: '—' });
      i++;
    }
  }
  return segments;
}

// ─── SYLLABIFY ───────────────────────────────────────────────────────
// ─── CLUSTER PATTERN HELPERS ─────────────────────────────────────────
function patKey(classes) { return classes.join(','); }

function patSetKey(pats) {
  // Build a Set of serialised patterns for O(1) lookup
  const s = new Set();
  for (const p of pats) s.add(patKey(p));
  return s;
}

function checkCluster(classes, allowedSet, forbiddenSet) {
  // Single consonants are always valid
  if (classes.length <= 1) return true;
  const key = patKey(classes);
  if (forbiddenSet && forbiddenSet.has(key)) return false;
  if (allowedSet  && allowedSet.size > 0) return allowedSet.has(key);
  return true; // unconstrained
}

function syllabify(segments, vowelMin, allowedOnsets, forbiddenOnsets, allowedCodas, forbiddenCodas, forbiddenOnsetPairs, maxOnsetLen, maxCodaLen) {
  const vals = segments.map(s => s.sonority), n = vals.length, peaks = [];
  for (let i = 0; i < n; i++) if (vals[i] >= vowelMin) peaks.push(i);
  if (peaks.length <= 1) return new Set();

  // Pre-build pattern Sets for O(1) lookup
  const aoSet = allowedOnsets  && allowedOnsets.length  ? patSetKey(allowedOnsets)  : null;
  const foSet = forbiddenOnsets && forbiddenOnsets.length? patSetKey(forbiddenOnsets): null;
  const acSet = allowedCodas   && allowedCodas.length   ? patSetKey(allowedCodas)   : null;
  const fcSet = forbiddenCodas && forbiddenCodas.length  ? patSetKey(forbiddenCodas) : null;
  // Homorgane Onsets: Set aus verbotenen Graphem-Paaren (z. B. "tn", "pm")
  const fopSet = forbiddenOnsetPairs && forbiddenOnsetPairs.length ? new Set(forbiddenOnsetPairs) : null;

  const boundaries = new Set();
  for (let p = 0; p < peaks.length - 1; p++) {
    const left = peaks[p], right = peaks[p + 1], cluster = [];
    for (let k = left+1; k < right; k++) cluster.push(k);
    if (cluster.length === 0) { boundaries.add(right); continue; }
    const cv = cluster.map(k => vals[k]);

    // ── Langvokal-Koda-Beschränkung (CV-Modell) ──────────────────────
    // Diphthonge und Langvokale (Grapheme mit Länge > 1, z. B. "ei", "au", "ie")
    // belegen zwei CV-Positionen → die Koda darf maximal einen Konsonanten haben
    const nucleusGrapheme = segments[left] ? segments[left].grapheme : '';
    // Nur echte Vokal-Grapheme als langer Nukleus — 'we','wa','wo' etc. sind Kons+Vokal
    const _VOWEL_CH = new Set('aeiouäöüáàâãéèêëíìîïóòôõúùûüýæœøőűāēīōū');
    const isLongNucleus = nucleusGrapheme && nucleusGrapheme.length > 1
      && [...nucleusGrapheme].every(c => _VOWEL_CH.has(c));
    // Effektive Koda-Grenze: Langvokal → max 1, sonst aus Profil
    const _mO = (maxOnsetLen  != null && maxOnsetLen  > 0) ? maxOnsetLen  : 99;
    const _mC = (maxCodaLen   != null && maxCodaLen   > 0) ? maxCodaLen   : 99;
    const effectiveMaxCoda = isLongNucleus ? Math.min(1, _mC) : _mC;

    // Max onset via SSP
    let ol = 1;
    for (let j = cv.length-2; j >= 0; j--) {
      if (cv[j] < cv[j+1]) ol++; else break;
    }
    // Silbenstruktur-Beschränkung: maxOnset begrenzt den Onset
    if (_mO < 99 && ol > _mO) ol = _mO;
    // Find best split: try from max onset down to 1
    let bestOl = null;
    for (let candidateOl = ol; candidateOl >= 1; candidateOl--) {
      const splitIdx = cv.length - candidateOl;
      const onsetClasses = cv.slice(splitIdx);
      const codaClasses  = cv.slice(0, splitIdx);

      // Langvokal-Koda-Beschränkung: nach Langvokal/Diphthong max. 1 Koda-Konsonant
      if (codaClasses.length > effectiveMaxCoda) continue;

      const onsetOk = checkCluster(onsetClasses, aoSet, foSet);
      const codaOk  = checkCluster(codaClasses,  acSet, fcSet);
      if (!onsetOk || !codaOk) continue;

      // ── Max. Silbenstruktur (CV-Modell) ─────────────────────────────────
      if (onsetClasses.length > _mO) continue;

      // ── Homorgane Onsets ──────────────────────────────────────────────
      // Graphem-basierte Prüfung: z. B. "tn", "pm" verboten (gleicher Artikulationsort)
      if (fopSet && onsetClasses.length > 1) {
        const onsetKey = cluster.slice(splitIdx).map(k => segments[k].grapheme).join('');
        if (fopSet.has(onsetKey)) continue;
      }

      bestOl = candidateOl; break;
    }
    // Fallback: wenn keine gültige Aufteilung gefunden, wende Langvokal-Beschränkung
    // trotzdem an (mindestens 1 Konsonant bleibt im Onset)
    if (bestOl === null) {
      const maxK = effectiveMaxCoda != null ? effectiveMaxCoda : cv.length - 1;
      bestOl = Math.max(1, cv.length - maxK);
    }
    boundaries.add(cluster[cv.length - bestOl]);
  }
  return boundaries;
}

