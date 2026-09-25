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
    const segs = parseWord(name, gmap, vowelMin, { silentFinalE: _silentFinalE, glideVowelPositional: _glideVowelPositional, ieHiatusCheck: _ieHiatusCheck });
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
// Problem-3-Fix: Apostrophe und Bindestriche (son < 0 oder Nicht-Buchstabe)
// werden als ihr eigenes Zeichen ins Muster uebernommen, nicht als 'C'.
// Beispiel: O'Connor → V'CVCCVC statt VCVCCVC
const _CV_BOUNDARY_RE = /^['\-]$/;
function segsToCVPattern(segs, vowelMin, gmap) {
  let pattern = '';
  for (const seg of segs) {
    // Sonderzeichen-Segment (son < 0): Zeichen direkt ins Muster
    if (seg.sonority !== undefined && seg.sonority < 0) {
      pattern += seg.text;
      continue;
    }
    // Gross-/Kleinschreibung: erstes Zeichen des Segments bestimmt den Case
    // fuer alle CV-Buchstaben dieses Segments.
    // Beispiel: "S"   → erstes Zeichen gross → "C"
    //           "ch"  → erstes Zeichen klein → "cc"
    //           "Sch" → erstes Zeichen gross → "CCC"
    //           "au"  → erstes Zeichen klein → "vv"
    // Jeder Buchstabe entscheidet fuer sich selbst: Gross im Original → Gross im Muster.
    // Sch → C+c+c = Ccc  |  SCH → C+C+C = CCC  |  sch → c+c+c = ccc
    // SCH'amur → CCC'vcvc
    for (const ch of seg.text) {
      if (_CV_BOUNDARY_RE.test(ch)) {
        // Apostroph oder Bindestrich direkt uebernehmen
        pattern += ch;
      } else {
        const chIsUpper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
        const son = (gmap && gmap.map && gmap.map[ch.toLowerCase()] !== undefined)
          ? gmap.map[ch.toLowerCase()] : 0;
        const letter = son >= vowelMin ? 'v' : 'c';
        pattern += chIsUpper ? letter.toUpperCase() : letter;
      }
    }
  }
  return pattern;
}

function calcLetterCombos(names, gmap, vowelMin) {
  const vGroups = {}, cGroups = {};

  names.forEach(rawName => {
    const segs = parseWord(rawName, gmap, vowelMin, { silentFinalE: _silentFinalE, glideVowelPositional: _glideVowelPositional, ieHiatusCheck: _ieHiatusCheck });
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
      // Aenderung 1: Sonderzeichen-Segmente (son < 0) unterbrechen den Run,
      // werden aber selbst nicht ins Cluster aufgenommen.
      if (seg.sonority < 0) { flushRun(); return; }
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
    const segs = parseWord(sylText, gmap, vowelMin, { silentFinalE: _silentFinalE, glideVowelPositional: _glideVowelPositional, ieHiatusCheck: _ieHiatusCheck });
    return segsToCVPattern(segs, vowelMin, gmap);
  };

  names.forEach(word => {
    // ── Use the central resolver so manual overrides are honoured ─────
    // resolveWordBoundaries() is defined in ui.js (loaded before stats.js)
    // and already applies manualHyphenations + morpheme splitting.
    const { segments: allSegs, boundaries: allBounds, boundaryChars: bChars } = resolveWordBoundaries(word, gmap, vowelMin, cl);
    const sylBounds = [0, ...[...allBounds].sort((a,b)=>a-b), allSegs.length];
    const syllables = [];
    for (let i = 0; i < sylBounds.length - 1; i++) {
      // Aenderung 1: Sonderzeichen (Apostroph/Bindestrich) werden NICHT in den
      // Silbentext uebernommen. Sie erscheinen nur in den Namenslängen-CV-Mustern
      // (calcCVPatterns). Dadurch bleiben Silben-JSON, Vokal-/Konsonanten-Cluster
      // und deren CV-Muster sonderzeichenfrei.
      const segText = allSegs.slice(sylBounds[i], sylBounds[i+1]).map(s => s.text).join('');
      const s = segText.toLowerCase();
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

// ── Hyphenation list for Unified JSON ────────────────────────────────
// Reuses the central resolveWordBoundaries()/buildEditableHyphenation()
// pipeline from ui.js (same one used for the per-word edit UI and for
// calcSyllableStats above) so that UI, statistics and JSON export can
// never diverge in their syllabification, and manualHyphenations are
// automatically honoured.
function buildHyphenationForWords(words, gmap, vowelMin, cl) {
  return words.map(word => {
    const { segments, boundaries } = resolveWordBoundaries(word, gmap, vowelMin, cl);
    return buildEditableHyphenation(segments, boundaries);
  });
}

// ── Berechnung: Namen → Unified-JSON-Datenobjekt ──────────────────────
// Reine Berechnungsfunktion (Punkt 6 "Berechnung"): erzeugt ausschließlich
// das Unified-JSON-Datenobjekt und hat KEINE Rendering-Seiteneffekte.
// Wird von runFullStats() (normale Analyse) aufgerufen.
function buildUnifiedStatsResult(words) {
  const vowelMin  = parseInt(document.getElementById('vowel-min').value) || 11;
  const gmap      = buildGraphemeMap(readClasses());
  const cl        = readClusters();
  const profileEl = document.getElementById('profile-select');
  const profileId = profileEl ? profileEl.value : 'custom';

  const lengthDist    = calcLengthDist(words);
  const cvPatterns    = calcCVPatterns(words, gmap, vowelMin);
  const letterCombos  = calcLetterCombos(words, gmap, vowelMin);
  const syllableStats = calcSyllableStats(words, gmap, vowelMin, cl);
  const hyphenation   = buildHyphenationForWords(words, gmap, vowelMin, cl);

  // Aenderung 2: Versionsnummer als Zeitstempel YYYY-MM-DD/HH-MM-SS
  const _now = new Date();
  const _pad = n => String(n).padStart(2, '0');
  const _timestamp = `${_now.getFullYear()}-${_pad(_now.getMonth()+1)}-${_pad(_now.getDate())}/${_pad(_now.getHours())}-${_pad(_now.getMinutes())}-${_pad(_now.getSeconds())}`;

  return {
    _version: _timestamp, profile: profileId, nameCount: words.length, names: words,
    hyphenation: hyphenation,
    nameLengths: Object.fromEntries(lengthDist.map(it => [String(it.length), { count: it.count, probability: it.probability }])),
    cvPatterns:  Object.fromEntries(cvPatterns.map(it => [String(it.length), { total: it.total, patterns: it.patterns }])),
    vowelCombinations: letterCombos.vowels,
    consonantCombinations: letterCombos.consonants,
    syllables: syllableStats
  };
}

// ── Build + run full statistics (normaler Analyse-Workflow) ───────────
// Berechnet das Unified JSON und übergibt es an renderStatsFromJSON() —
// das ist ab jetzt der EINZIGE Weg, wie Tabellen + JSON-Anzeige aktuell
// gehalten werden (Punkt 7: "nur noch ein Tabellen-Rendering-Weg").
function runFullStats(words) {
  const result = buildUnifiedStatsResult(words);
  renderStatsFromJSON(result);
}

// ── Darstellung: Unified-JSON-Datenobjekt → UI (Punkt 6 "Darstellung") ──
// Einzige Stelle, die _lastStatsResult setzt, die JSON-Anzeige aktualisiert
// und die Tabellenrenderer aufruft. Wird sowohl nach einer normalen
// Analyse als auch nach Übernahme einer manuellen Bearbeitung oder nach
// einem Datei-Import aufgerufen — OHNE erneute Analyse/Berechnung.
function renderStatsFromJSON(data) {
  _lastStatsResult = data;
  const jsonOutEl = document.getElementById('json-output');
  if (jsonOutEl) jsonOutEl.textContent = JSON.stringify(data, null, 2);

  renderLengthTable(data.nameLengths);
  renderCVTable(data.cvPatterns);
  const syl = (data.syllables && typeof data.syllables === 'object') ? data.syllables : {};
  renderCVByPositionTable('tbl-cv-pos', syl);
  renderComboTable('tbl-vowels', data.vowelCombinations);
  renderPositionComboTable('tbl-vowels-pre', data.vowelCombinations, 'prefix');
  renderPositionComboTable('tbl-vowels-in',  data.vowelCombinations, 'infix');
  renderPositionComboTable('tbl-vowels-suf', data.vowelCombinations, 'suffix');
  renderComboTable('tbl-cons', data.consonantCombinations);
  renderPositionComboTable('tbl-cons-pre', data.consonantCombinations, 'prefix');
  renderPositionComboTable('tbl-cons-in',  data.consonantCombinations, 'infix');
  renderPositionComboTable('tbl-cons-suf', data.consonantCombinations, 'suffix');
  renderSyllableTable('tbl-syl-pre', syl.prefix);
  renderSyllableTable('tbl-syl-in',  syl.infix);
  renderSyllableTable('tbl-syl-suf', syl.suffix);
  renderNameSyllableTable(data.names, data.hyphenation);
  renderAllDiceTables(data);

  const statsArea = document.getElementById('stats-area');
  if (statsArea) statsArea.style.display = 'block';
}

// ── Schema-Validierung für importiertes/bearbeitetes Unified JSON ─────
// Prüft NUR die Struktur des Unified JSON (nicht des separaten
// Profil-JSON aus exportProfile()/importProfile() — Punkt 4/15).
// Gibt bei einem Fehler eine für den Nutzer verständliche deutsche
// Fehlermeldung zurück, sonst null.
//
// Rückwärtskompatibilität (Migrations-Prompt): prüft ausdrücklich NICHT
// das Feld "hyphenation" — das ist Sache von validateAndMigrateUnifiedJSON(),
// da ein fehlendes "hyphenation" ein zulässiges altes Format ist, kein
// Validierungsfehler. Diese Basisfunktion deckt alles ab, was für ALLE
// Unified-JSON-Versionen (alt und neu) gleichermaßen gelten muss.
function _validateUnifiedJSONBase(data) {
  const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

  if (!isPlainObject(data)) {
    return 'Ungültiges Unified JSON: Erwartet wird ein JSON-Objekt.';
  }
  if (!Array.isArray(data.names)) {
    return 'Ungültiges Unified JSON: Feld "names" fehlt oder ist kein Array. (Handelt es sich vielleicht um ein Sprachprofil statt um ein Vereinigtes JSON?)';
  }

  // Statistikfelder sind optional (Punkt 13: leere/unvollständige Daten
  // erlaubt), müssen aber, falls vorhanden, Objekte sein.
  const optionalObjectFields = ['nameLengths', 'cvPatterns', 'vowelCombinations', 'consonantCombinations', 'syllables'];
  for (const field of optionalObjectFields) {
    if (data[field] !== undefined && !isPlainObject(data[field])) {
      return `Ungültiges Unified JSON: Feld "${field}" muss ein Objekt sein.`;
    }
  }
  return null;
}

// ── Normalisierung: fehlende optionale Felder mit sinnvollen Defaults ──
function normalizeUnifiedJSON(data) {
  const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
  return {
    _version: typeof data._version === 'string' ? data._version : '',
    profile:  typeof data.profile === 'string' ? data.profile : 'custom',
    nameCount: Number.isFinite(data.nameCount) ? data.nameCount : data.names.length,
    names: data.names,
    hyphenation: data.hyphenation,
    nameLengths: isPlainObject(data.nameLengths) ? data.nameLengths : {},
    cvPatterns:  isPlainObject(data.cvPatterns)  ? data.cvPatterns  : {},
    vowelCombinations:     isPlainObject(data.vowelCombinations)     ? data.vowelCombinations     : {},
    consonantCombinations: isPlainObject(data.consonantCombinations) ? data.consonantCombinations : {},
    syllables: isPlainObject(data.syllables) ? data.syllables : {},
  };
}

// ── Rückwärtskompatible Validierung + Migration ─────────────────────
// Zentrale Funktion für Editor-Übernahme UND Datei-Import (Punkt 10/11):
// beide rufen ausschließlich diese Funktion auf, es gibt keine doppelte
// Migrationslogik.
//
// Unterscheidung (Punkt 1):
//   hyphenation === undefined (Feld fehlt komplett)
//     → gültiges ALTES Unified JSON (vor Einführung von "hyphenation")
//     → wird migriert: hyphenation wird aus "names" ergänzt,
//       alle anderen Felder (insbesondere die Statistikdaten) bleiben
//       exakt wie im importierten JSON erhalten (Punkt 2/6).
//   hyphenation vorhanden, aber kein Array oder falsche Länge
//     → weiterhin ein Validierungsfehler (Punkt 1 Fall B, Punkt 8 — gilt
//       auch für hyphenation: null, da null !== undefined).
//
// _version wird NICHT zur Formaterkennung herangezogen (Punkt 9): es ist
// nur ein Zeitstempel-String ohne Schema-Semantik. Die zuverlässige und
// bereits vom bestehenden Datenmodell hergeleitete Unterscheidung ist
// schlicht "ist das Feld hyphenation vorhanden?".
//
// @returns {{ data: object|null, error: string|null, migrated: boolean }}
function validateAndMigrateUnifiedJSON(data) {
  const baseError = _validateUnifiedJSONBase(data);
  if (baseError) return { data: null, error: baseError, migrated: false };

  if (data.hyphenation === undefined) {
    // Fall A: altes Unified JSON → hyphenation ergänzen.
    // Nutzt exakt dieselbe zentrale Silbentrennungs-Pipeline wie die
    // normale Analyse (resolveWordBoundaries()/buildEditableHyphenation()
    // aus ui.js, gekapselt in buildHyphenationForWords() aus diesem File)
    // — keine neue/zweite Silbentrennungslogik.
    const vowelMin = parseInt(document.getElementById('vowel-min').value) || 11;
    const gmap = buildGraphemeMap(readClasses());
    const cl = readClusters();
    const migratedHyphenation = buildHyphenationForWords(data.names, gmap, vowelMin, cl);

    // Nur "hyphenation" wird ergänzt — alle anderen Felder (insbesondere
    // nameLengths/cvPatterns/vowelCombinations/consonantCombinations/
    // syllables) werden unverändert aus dem importierten JSON übernommen,
    // NICHT neu berechnet (Punkt 2/6).
    const migrated = Object.assign({}, data, { hyphenation: migratedHyphenation });
    return { data: normalizeUnifiedJSON(migrated), error: null, migrated: true };
  }

  // Fall B: hyphenation vorhanden → strikt prüfen, keine Migration.
  if (!Array.isArray(data.hyphenation)) {
    return { data: null, error: 'Ungültiges Unified JSON: Feld "hyphenation" fehlt oder ist kein Array.', migrated: false };
  }
  if (data.names.length !== data.hyphenation.length) {
    return { data: null, error: 'JSON kann nicht übernommen werden: "names" und "hyphenation" müssen gleich viele Einträge enthalten.', migrated: false };
  }

  return { data: normalizeUnifiedJSON(data), error: null, migrated: false };
}

// ── JSON-Editiermodus: Anzeige-/Editierzustand umschalten ──────────────
function enterJSONEditMode() {
  const pre    = document.getElementById('json-output');
  const editor = document.getElementById('json-editor');
  const viewActions = document.getElementById('json-view-actions');
  const editActions = document.getElementById('json-edit-actions');
  const errorDiv     = document.getElementById('json-edit-error');
  if (!pre || !editor) return;

  editor.value = _lastStatsResult ? JSON.stringify(_lastStatsResult, null, 2) : (pre.textContent || '');
  pre.style.display = 'none';
  editor.style.display = '';
  if (viewActions) viewActions.style.display = 'none';
  if (editActions) editActions.style.display = '';
  if (errorDiv) errorDiv.style.display = 'none';
  editor.focus();
}

function cancelJSONEdit() {
  const pre    = document.getElementById('json-output');
  const editor = document.getElementById('json-editor');
  const viewActions = document.getElementById('json-view-actions');
  const editActions = document.getElementById('json-edit-actions');
  const errorDiv     = document.getElementById('json-edit-error');
  if (!pre || !editor) return;

  editor.style.display = 'none';
  pre.style.display = '';
  if (viewActions) viewActions.style.display = '';
  if (editActions) editActions.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'none';
}

function _showJSONEditError(msg) {
  const errorDiv = document.getElementById('json-edit-error');
  if (!errorDiv) return;
  errorDiv.textContent = msg;
  errorDiv.style.display = '';
}

// ── Übernehmen: Editor-Inhalt validieren/migrieren und als neues
//    Unified JSON übernehmen (Punkt 3, 8, 12). Bei Fehlern bleiben
//    bestehende Daten, Tabellen und Editiermodus unverändert erhalten.
function applyJSONEdit() {
  const editor = document.getElementById('json-editor');
  if (!editor) return;

  let parsed;
  try {
    parsed = JSON.parse(editor.value);
  } catch (e) {
    _showJSONEditError('Ungültiges JSON: ' + e.message);
    return; // im Editiermodus bleiben, nichts überschreiben
  }

  const { data: migrated, error: schemaError } = validateAndMigrateUnifiedJSON(parsed);
  if (schemaError) {
    _showJSONEditError(schemaError);
    return; // im Editiermodus bleiben, nichts überschreiben
  }

  renderStatsFromJSON(migrated); // KEIN analyze() — JSON ist hier die Quelle
  cancelJSONEdit();
}

// ── Import: bereits exportiertes Unified JSON aus einer .json-Datei ───
function triggerJSONImport() {
  const input = document.getElementById('json-import-file');
  if (input) input.click();
}

function handleJSONImportFile(evt) {
  const file = evt.target.files && evt.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(String(reader.result));
    } catch (e) {
      _showJSONEditError('Ungültiges JSON: ' + e.message);
      evt.target.value = '';
      return;
    }
    const { data: migrated, error: schemaError } = validateAndMigrateUnifiedJSON(parsed);
    if (schemaError) {
      _showJSONEditError(schemaError);
      evt.target.value = '';
      return;
    }
    // Punkt 9/10 (Erst-Prompt): KEIN analyze(), KEIN Schreiben in
    // words-input — die Tabellen entstehen ausschließlich aus den
    // bereits im (ggf. migrierten) JSON enthaltenen Statistikdaten.
    renderStatsFromJSON(migrated);
    cancelJSONEdit();
    evt.target.value = '';
  };
  reader.onerror = () => {
    _showJSONEditError('Datei konnte nicht gelesen werden.');
    evt.target.value = '';
  };
  reader.readAsText(file, 'utf-8');
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

// Punkt 5/6 (Architektur-Refactor): Die Tabellenrenderer arbeiten ab sofort
// direkt mit den Datenstrukturen, wie sie im Unified JSON gespeichert werden
// (Objekte, nach Länge als String-Key gruppiert), statt mit separaten,
// nur intern verwendeten Array-Zwischenformaten. Dadurch gibt es nur noch
// EIN Datenmodell für Statistik-Anzeige und JSON — egal ob das JSON gerade
// frisch berechnet, manuell bearbeitet oder importiert wurde.
// Alle Renderer sind zusätzlich robust gegenüber fehlenden/leeren Feldern,
// da ein importiertes/bearbeitetes JSON unvollständig sein darf (Punkt 13).

// Gemeinsame Zeilen-Extraktion für EINE Position aus combosByPos[pos] —
// wiederverwendet von renderComboTable() (alle Positionen kombiniert) UND
// renderPositionComboTable() (einzelne Position). Keine doppelte
// Aggregationslogik (Punkt 10).
function _comboRowsForPosition(byLen) {
  const src = (byLen && typeof byLen === 'object') ? byLen : {};
  const lengths = Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
  const rows = [];
  lengths.forEach(len => {
    Object.entries(src[String(len)] || {}).forEach(([k,v]) => {
      rows.push({
        length: len,
        key: k,
        cvPattern: (v && v.cvPattern) || '',
        count: (v && v.count) ?? 0,
        probByLength: Number((v && v.probByLength) || 0),
        probOverall: Number((v && v.probOverall) || 0)
      });
    });
  });
  return rows;
}

function renderComboTable(containerId, combosByPos) {
  const el = document.getElementById(containerId); el.innerHTML = '';
  const src = (combosByPos && typeof combosByPos === 'object') ? combosByPos : {};
  const posLabel = { prefix:'Präfix', infix:'Infix', suffix:'Suffix' };
  const rows = [];
  ['prefix','infix','suffix'].forEach(pos => {
    _comboRowsForPosition(src[pos]).forEach(r => {
      rows.push([
        r.length,
        posLabel[pos],
        `<code>${escapeHtml(r.key)}</code>`,
        `<code class="text-muted">${escapeHtml(r.cvPattern)}</code>`,
        r.count,
        r.probByLength.toFixed(2).replace('.',','),
        r.probOverall.toFixed(2).replace('.',',')
      ]);
    });
  });
  if (!rows.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Daten.</p>'; return; }
  el.appendChild(makeCopyTable(containerId+'-copy',
    ['Länge', 'Position', 'Kombination', 'CV-Muster', 'Anzahl', 'Warscheinlichkeit pro Länge (%)', 'Warscheinlichkeit gesamt (%)'],
    rows));
}

// ── Zusätzliche Einzel-Positions-Tabellen (Punkt 2–5) ──────────────────
// Stellen jeweils NUR eine Position (prefix/infix/suffix) aus derselben
// bereits vorhandenen Datenquelle (data.vowelCombinations /
// data.consonantCombinations) dar — keine neue Berechnung, keine
// Veränderung der bestehenden kombinierten Tabelle (renderComboTable
// bleibt unverändert erhalten).
function renderPositionComboTable(containerId, combosByPos, position) {
  const el = document.getElementById(containerId); if (!el) return; el.innerHTML = '';
  const src = (combosByPos && typeof combosByPos === 'object') ? combosByPos : {};
  const rows = _comboRowsForPosition(src[position]).map(r => [
    r.length,
    `<code>${escapeHtml(r.key)}</code>`,
    `<code class="text-muted">${escapeHtml(r.cvPattern)}</code>`,
    r.count,
    r.probByLength.toFixed(2).replace('.',','),
    r.probOverall.toFixed(2).replace('.',',')
  ]);
  if (!rows.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Daten.</p>'; return; }
  el.appendChild(makeCopyTable(containerId+'-copy',
    ['Länge', 'Kombination', 'CV-Muster', 'Anzahl', 'Warscheinlichkeit pro Länge (%)', 'Warscheinlichkeit gesamt (%)'],
    rows));
}

function renderLengthTable(nameLengths) {
  const el = document.getElementById('tbl-lengths'); el.innerHTML = '';
  const src = (nameLengths && typeof nameLengths === 'object') ? nameLengths : {};
  const lengths = Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
  const rows = lengths.map(len => {
    const d = src[String(len)] || {};
    return [len, d.count ?? 0, Number(d.probability || 0).toFixed(2).replace('.',',')];
  });
  el.appendChild(makeCopyTable('tbl-lengths-copy',
    ['Länge', 'Anzahl', 'Warscheinlichkeit (%)'],
    rows
  ));
}

function renderCVTable(cvPatterns) {
  const el = document.getElementById('tbl-cv'); el.innerHTML = '';
  const src = (cvPatterns && typeof cvPatterns === 'object') ? cvPatterns : {};
  const rows = [];
  const lengths = Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
  lengths.forEach(len => {
    const item = src[String(len)] || {};
    const patterns = item.patterns || {};
    Object.entries(patterns).forEach(([pat, prob]) => {
      rows.push([len, `<code>${escapeHtml(pat)}</code>`, Number(prob || 0).toFixed(2).replace('.',',')]);
    });
  });
  el.appendChild(makeCopyTable('tbl-cv-copy', ['Länge', 'CV-Muster', 'Warscheinlichkeit (%)'], rows));
}

// ── CV-Muster nach Position (Punkt 1) ──────────────────────────────────
// Leitet eine Positions-/Längen-/CV-Muster-Verteilung AUSSCHLIESSLICH aus
// dem bereits vorhandenen "syllables"-Feld des Unified JSON ab: jede
// Silbe dort trägt schon ihr eigenes berechnetes cvPattern (siehe
// calcSyllableStats()). Diese Funktion fasst nur die bereits pro Silbe
// berechneten CV-Muster nach Position+Länge zusammen (reine
// Nachverarbeitung, keine erneute linguistische Analyse, kein erneutes
// Parsen der Namen — Punkt 9/15). Deshalb ist dafür KEIN neues Feld im
// Unified JSON nötig (Punkt 8).
function _aggregateCVPatternsByPosition(syllablesData) {
  const positions = ['prefix', 'infix', 'suffix'];
  const src = (syllablesData && typeof syllablesData === 'object') ? syllablesData : {};
  const posTotals = { prefix: 0, infix: 0, suffix: 0 };
  const rows = [];

  positions.forEach(pos => {
    const byLen = (src[pos] && typeof src[pos] === 'object') ? src[pos] : {};
    Object.keys(byLen).forEach(len => {
      const entries = (byLen[len] && typeof byLen[len] === 'object') ? byLen[len] : {};
      const patCounts = {}; // cvPattern -> aufsummierte Anzahl
      Object.values(entries).forEach(entry => {
        const pat = (entry && entry.cvPattern) || '';
        const cnt = (entry && entry.count) || 0;
        patCounts[pat] = (patCounts[pat] || 0) + cnt;
        posTotals[pos] += cnt;
      });
      const lenTotal = Object.values(patCounts).reduce((s, c) => s + c, 0);
      Object.entries(patCounts).forEach(([pat, cnt]) => {
        rows.push({ position: pos, length: Number(len), cvPattern: pat, count: cnt, lenTotal });
      });
    });
  });

  return rows.map(r => ({
    position: r.position,
    length: r.length,
    cvPattern: r.cvPattern,
    count: r.count,
    probByLength: r.lenTotal > 0 ? Number(((r.count / r.lenTotal) * 100).toFixed(2)) : 0,
    probOverall: posTotals[r.position] > 0 ? Number(((r.count / posTotals[r.position]) * 100).toFixed(2)) : 0
  }));
}

function renderCVByPositionTable(containerId, syllablesData) {
  const el = document.getElementById(containerId); if (!el) return; el.innerHTML = '';
  const posOrder = ['prefix', 'infix', 'suffix'];
  const posLabel = { prefix: 'Präfix', infix: 'Infix', suffix: 'Suffix' };
  const agg = _aggregateCVPatternsByPosition(syllablesData);
  if (!agg.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Daten.</p>'; return; }

  agg.sort((a, b) =>
    posOrder.indexOf(a.position) - posOrder.indexOf(b.position) ||
    a.length - b.length ||
    b.probOverall - a.probOverall
  );

  const rows = agg.map(r => [
    posLabel[r.position] || r.position,
    r.length,
    `<code>${escapeHtml(r.cvPattern)}</code>`,
    r.count,
    Number(r.probByLength).toFixed(2).replace('.',','),
    Number(r.probOverall).toFixed(2).replace('.',',')
  ]);
  el.appendChild(makeCopyTable(containerId+'-copy',
    ['Position', 'Länge', 'CV-Muster', 'Anzahl', 'Warscheinlichkeit pro Position+Länge (%)', 'Warscheinlichkeit gesamt (Position) (%)'],
    rows));
}

function renderSyllableTable(containerId, sylByLen) {
  const el = document.getElementById(containerId); el.innerHTML = '';
  const src = (sylByLen && typeof sylByLen === 'object') ? sylByLen : {};
  const lengths = Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
  if (!lengths.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Silben gefunden.</p>'; return; }
  const rows = [];
  lengths.forEach(len => {
    Object.entries(src[String(len)] || {}).forEach(([k,v]) => {
      rows.push([
        len,
        `<strong>${escapeHtml(k)}</strong>`,
        `<code class="text-muted">${escapeHtml((v && v.cvPattern) || '')}</code>`,
        (v && v.count) ?? 0,
        Number((v && v.probByLength) || 0).toFixed(2).replace('.',','),
        Number((v && v.probOverall) || 0).toFixed(2).replace('.',',')
      ]);
    });
  });
  el.appendChild(makeCopyTable(containerId+'-copy',
    ['Länge', 'Silbe', 'CV-Muster', 'Anzahl', 'Warscheinlichkeit pro Länge (%)', 'Warscheinlichkeit gesamt (%)'],
    rows));
}

// ═══════════════════════════════════════════════════════════════════
// WÜRFELTABELLEN-SYSTEM (W10-Zufallstabellen zu jeder Statistik-Tabelle)
// ═══════════════════════════════════════════════════════════════════
//
// Kernidee: JEDE Tabelle — ob alle Einträge gleich wahrscheinlich sind
// oder unterschiedliche Häufigkeiten/Prozentwerte besitzen — wird über
// EIN einziges, gewichtetes Verfahren behandelt: das "größte Reste"-
// Verfahren (Largest-Remainder-/Hamilton-Apportionment, Punkt 12).
// Gleichwahrscheinliche Einträge sind darin einfach der Sonderfall
// "alle Gewichte gleich groß" — es gibt keine separate Fall-A/Fall-B-
// Codeverzweigung im Kern, nur unterschiedliche Gewichte, die eine
// Tabelle mitbringt (Punkt 11).
//
// Ablauf (Punkt 13/26):
// 1) Würfelanzahl bestimmen — siehe _diceCountForWeights() (Punkt 1/17):
//    Grundregel 10^n >= AnzahlEinträge; bei UNTERSCHIEDLICHEN Gewichten
//    zusätzlich so viele Würfel, dass die Prozent-Genauigkeit der
//    Gewichte exakt abbildbar ist (Punkt 12).
// 2) Gesamtspannweite M = 10^n (Punkt 2).
// 3) Rohanteil je Eintrag: raw_i = M * weight_i / Summe(weight).
//    floor_i = floor(raw_i) ist die garantierte Mindestanzahl (Punkt 6).
// 4) Rest = M - Summe(floor_i) Würfelergebnisse werden verteilt: die
//    Einträge mit dem größten Nachkommaanteil (raw_i - floor_i) bekommen
//    zuerst je 1 zusätzliches Ergebnis (Largest-Remainder, Punkt 12).
// 5) Bei Gleichstand im Nachkommaanteil (bei gleichen Gewichten haben
//    ALLE Einträge denselben Rest!) werden die Bonus-Plätze innerhalb
//    der gleichrangigen Gruppe gleichmäßig über deren Positionen
//    verteilt (Bresenham-artige Auswahl) statt einfach die ersten zu
//    nehmen — verhindert die in Punkt 10 verbotene Häufung am
//    Anfang/Ende.
// 6) Die so bestimmten Ergebnis-Anzahlen werden in der UNVERÄNDERTEN
//    Reihenfolge der Tabelle zu fortlaufenden, lückenlosen Bereichen
//    [from, to] zusammengesetzt (Punkt 9) — Summe aller Bereichsbreiten
//    = M exakt (Punkt 8).
//
// Die Renderer übergeben lediglich Einträge + eine Gewichts-Funktion;
// sie enthalten selbst keine Würfellogik (Punkt 13/27) — es findet auch
// keine erneute linguistische Analyse statt, nur Nachverarbeitung der
// bereits im Unified JSON vorhandenen Statistikdaten.

function _diceCountForEntries(n) {
  if (n <= 0) return 0;
  let dice = 1;
  while (Math.pow(10, dice) < n) dice++;
  return dice;
}

function _decimalDigits(x) {
  if (!isFinite(x)) return 0;
  const s = String(x);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : (s.length - dot - 1);
}

// Siehe Erklärung im Kommentarblock oben (Punkt 1 vs. Punkt 12): bei
// gleichen Gewichten reicht die reine Einträge-Regel; bei ungleichen
// Gewichten wird zusätzlich genug Würfel-Auflösung verlangt, um die
// Prozent-Genauigkeit der Gewichte exakt abzubilden (Basis 100 plus so
// viele Nachkommastellen wie im genauesten Eingabewert, gedeckelt bei 4).
function _diceCountForWeights(n, weights) {
  const base = _diceCountForEntries(n);
  const allEqual = weights.every(w => w === weights[0]);
  if (allEqual) return base;
  const maxDecimals = weights.reduce((m, w) => Math.max(m, _decimalDigits(w)), 0);
  const precisionTarget = 2 + Math.min(maxDecimals, 4);
  return Math.max(base, precisionTarget);
}

// Wählt aus einer Gruppe von Original-Indizes `k` davon möglichst
// gleichmäßig über die ganze Gruppe verteilt aus, statt einfach die
// ersten k zu nehmen (Punkt 10).
function _pickEvenlySpaced(indices, k) {
  const L = indices.length;
  if (k >= L) return indices.slice();
  const picked = [];
  for (let i = 0; i < k; i++) picked.push(indices[Math.floor((i * L) / k)]);
  return picked;
}

// Kern: verteilt `totalOutcomes` Würfelergebnisse proportional zu
// `weights` (positive Zahlen, eine je Eintrag, in Tabellenreihenfolge)
// nach dem größten-Reste-Verfahren. Rückgabe: Anzahl zugewiesener
// Würfelergebnisse je Eintrag (Summe === totalOutcomes; jeder Wert ist
// floor(raw_i) oder floor(raw_i)+1).
function _apportionOutcomes(weights, totalOutcomes) {
  const n = weights.length;
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0 || n === 0) return weights.map(() => 0);

  const raw = weights.map(w => (totalOutcomes * w) / weightSum);
  const floorVals = raw.map(Math.floor);
  const assigned = floorVals.reduce((s, v) => s + v, 0);
  let deficit = totalOutcomes - assigned;

  const counts = floorVals.slice();
  if (deficit > 0) {
    const remainders = raw.map((r, i) => ({ i, rem: r - floorVals[i] }));
    remainders.sort((a, b) => b.rem - a.rem);

    const EPS = 1e-9;
    let idx = 0;
    while (deficit > 0 && idx < remainders.length) {
      let j = idx;
      while (j < remainders.length && Math.abs(remainders[j].rem - remainders[idx].rem) < EPS) j++;
      const groupIndices = remainders.slice(idx, j).map(r => r.i).sort((a, b) => a - b);
      const take = Math.min(deficit, groupIndices.length);
      _pickEvenlySpaced(groupIndices, take).forEach(gi => { counts[gi]++; });
      deficit -= take;
      idx = j;
    }
  }
  return counts;
}

// Baut aus counts[] (Anzahl Würfelergebnisse je Eintrag, in Tabellen-
// reihenfolge) fortlaufende, lückenlose Bereiche [from, to] (Punkt 9).
function _countsToRanges(counts) {
  const ranges = [];
  let cursor = 1;
  counts.forEach((c, i) => {
    if (c <= 0) return; // Eintrag ohne Gewicht bekommt keinen Bereich
    ranges.push({ index: i, from: cursor, to: cursor + c - 1, count: c });
    cursor += c;
  });
  return ranges;
}

// ── Zentrale Würfeltabellen-Funktion (Punkt 13/14) ─────────────────────
// entries: Array beliebiger Objekte in der Reihenfolge der Statistik-
//          Tabelle. getWeight(entry) liefert das Gewicht (bevorzugt eine
//          reale Anzahl/"count", ersatzweise eine gespeicherte
//          Wahrscheinlichkeit; bei Gleichverteilung liefert sie für
//          jeden Eintrag denselben Wert, z. B. 1).
// Rückgabe: null bei 0 Einträgen (Punkt 18); { special:'single', entry }
// bei genau 1 Eintrag (Punkt 19, kein Würfel nötig); sonst
// { dice, sides:10, totalOutcomes, ranges } (Punkt 14), wobei jeder
// Range { index, from, to, count, entry, probability } enthält.
function buildDiceTable(entries, getWeight) {
  const n = entries.length;
  if (n === 0) return null;
  if (n === 1) return { special: 'single', entry: entries[0] };

  const weights = entries.map(e => {
    const w = getWeight(e);
    return (typeof w === 'number' && w > 0) ? w : 0;
  });
  const hasAnyWeight = weights.some(w => w > 0);
  const effectiveWeights = hasAnyWeight ? weights : entries.map(() => 1);

  const dice = _diceCountForWeights(n, effectiveWeights);
  const totalOutcomes = Math.pow(10, dice);

  const counts = _apportionOutcomes(effectiveWeights, totalOutcomes);
  const ranges = _countsToRanges(counts).map(r => ({
    index: r.index, from: r.from, to: r.to, count: r.count,
    entry: entries[r.index],
    // Punkt 24: Wahrscheinlichkeit wird IMMER aus den ganzzahligen
    // Würfelergebnissen berechnet (count/totalOutcomes), nie aus dem
    // ursprünglichen (ggf. gerundeten) Gewicht — Rundungsfehler in der
    // Anzeige können so die interne Summe nicht verfälschen.
    probability: Number(((r.count / totalOutcomes) * 100).toFixed(4))
  }));

  return { dice, sides: 10, totalOutcomes, ranges };
}

// ── Generischer Würfeltabellen-Renderer (Punkt 15/16/23) ───────────────
// labelColumns: [{ header, get(entry) }] beschreibt, wie ein Eintrag in
// der Tabelle dargestellt wird (z. B. Länge/CV-Muster/Silbe...).
function renderDiceTable(containerId, entries, getWeight, labelColumns) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  const dt = buildDiceTable(entries, getWeight);
  if (dt === null) { el.innerHTML = '<p class="text-muted small p-2">Keine Daten.</p>'; return; }

  if (dt.special === 'single') {
    const label = labelColumns.map(c => c.get(dt.entry)).join(' · ');
    el.innerHTML = `<p class="small p-2 mb-0 text-muted"><i class="bi bi-dice-3 me-1"></i>` +
      `Nur 1 Eintrag — kein Würfel nötig. Immer: <strong>${escapeHtml(label)}</strong></p>`;
    return;
  }

  const { dice, totalOutcomes, ranges } = dt;
  const zeros = Array(dice).fill('0').join('-');
  const info = document.createElement('div');
  info.className = 'small text-muted mb-2';
  info.innerHTML = `Würfel: <strong>${dice}W10</strong> &middot; Ergebnisbereich: <strong>1–${totalOutcomes}</strong>` +
    ` &middot; Hinweis: <code>${zeros}</code> zählt als <strong>${totalOutcomes}</strong>, nicht als 0`;
  el.appendChild(info);

  const headers = ['Würfel', 'Ergebnisbereich', ...labelColumns.map(c => c.header), 'Wahrscheinlichkeit (%)'];
  const rows = ranges.map(r => {
    const rangeText = r.from === r.to ? String(r.from) : `${r.from}–${r.to}`;
    return [
      `${dice}W10`,
      rangeText,
      ...labelColumns.map(c => escapeHtml(String(c.get(r.entry)))),
      Number(r.probability).toFixed(2).replace('.', ',')
    ];
  });
  el.appendChild(makeCopyTable(containerId + '-copy', headers, rows));
}

// ── Entry-Extraktion je Statistik-Tabelle (reine Nachverarbeitung der
//    bereits vorhandenen Unified-JSON-Felder, keine neue Analyse) ──────
function _diceEntriesFromNameLengths(nameLengths) {
  const src = (nameLengths && typeof nameLengths === 'object') ? nameLengths : {};
  return Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b)
    .map(len => {
      const d = src[String(len)] || {};
      return { length: len, count: d.count || 0, probability: d.probability || 0 };
    });
}

function _diceEntriesFromCVPatterns(cvPatterns) {
  const src = (cvPatterns && typeof cvPatterns === 'object') ? cvPatterns : {};
  const out = [];
  Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b).forEach(len => {
    const item = src[String(len)] || {};
    Object.entries(item.patterns || {}).forEach(([pat, prob]) => {
      out.push({ length: len, cvPattern: pat, probability: Number(prob) || 0 });
    });
  });
  return out;
}

function _diceEntriesFromComboAll(combosByPos) {
  const src = (combosByPos && typeof combosByPos === 'object') ? combosByPos : {};
  const posLabel = { prefix:'Präfix', infix:'Infix', suffix:'Suffix' };
  const out = [];
  ['prefix','infix','suffix'].forEach(pos => {
    _comboRowsForPosition(src[pos]).forEach(r => out.push({
      position: posLabel[pos], length: r.length, key: r.key, cvPattern: r.cvPattern, count: r.count
    }));
  });
  return out;
}

function _diceEntriesFromComboPosition(combosByPos, position) {
  const src = (combosByPos && typeof combosByPos === 'object') ? combosByPos : {};
  return _comboRowsForPosition(src[position]).map(r => ({
    length: r.length, key: r.key, cvPattern: r.cvPattern, count: r.count
  }));
}

function _diceEntriesFromSyllables(sylByLen) {
  const src = (sylByLen && typeof sylByLen === 'object') ? sylByLen : {};
  const out = [];
  Object.keys(src).map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b).forEach(len => {
    Object.entries(src[String(len)] || {}).forEach(([syl, v]) => {
      out.push({ length: len, syl, cvPattern: (v && v.cvPattern) || '', count: (v && v.count) || 0 });
    });
  });
  return out;
}

function _diceEntriesFromNames(names, hyphenation) {
  const namesArr = Array.isArray(names) ? names : [];
  const hyphArr = Array.isArray(hyphenation) ? hyphenation : [];
  return namesArr.map((name, i) => ({ name, hyphenation: hyphArr[i] || '' }));
}

// ── Alle Würfeltabellen aus dem Unified JSON aufbauen (Punkt 20-22) ────
// Wird von renderStatsFromJSON() nach den normalen Statistik-Tabellen
// aufgerufen — funktioniert dadurch automatisch bei normaler Analyse,
// JSON-Import UND Editor-Übernahme, ohne dass hierfür ein erneutes
// analyze() nötig wäre.
function renderAllDiceTables(data) {
  const cLen = [{ header: 'Länge', get: e => e.length }];
  const cCv  = [{ header: 'Länge', get: e => e.length }, { header: 'CV-Muster', get: e => e.cvPattern }];
  const cComboAll = [{ header: 'Position', get: e => e.position }, { header: 'Länge', get: e => e.length },
                      { header: 'Kombination', get: e => e.key }, { header: 'CV-Muster', get: e => e.cvPattern }];
  const cCombo = [{ header: 'Länge', get: e => e.length }, { header: 'Kombination', get: e => e.key },
                   { header: 'CV-Muster', get: e => e.cvPattern }];
  const cSyl = [{ header: 'Länge', get: e => e.length }, { header: 'Silbe', get: e => e.syl }];
  const cName = [{ header: 'Name', get: e => e.name }];

  const syl = (data.syllables && typeof data.syllables === 'object') ? data.syllables : {};

  renderDiceTable('tbl-lengths-dice', _diceEntriesFromNameLengths(data.nameLengths), e => e.count || e.probability, cLen);
  renderDiceTable('tbl-cv-dice', _diceEntriesFromCVPatterns(data.cvPatterns), e => e.probability, cCv);
  renderDiceTable('tbl-cv-pos-dice', _aggregateCVPatternsByPosition(syl), e => e.count,
    [{ header:'Position', get:e=>({prefix:'Präfix',infix:'Infix',suffix:'Suffix'})[e.position]||e.position },
     { header:'Länge', get:e=>e.length }, { header:'CV-Muster', get:e=>e.cvPattern }]);

  renderDiceTable('tbl-vowels-dice', _diceEntriesFromComboAll(data.vowelCombinations), e => e.count, cComboAll);
  renderDiceTable('tbl-vowels-pre-dice', _diceEntriesFromComboPosition(data.vowelCombinations, 'prefix'), e => e.count, cCombo);
  renderDiceTable('tbl-vowels-in-dice',  _diceEntriesFromComboPosition(data.vowelCombinations, 'infix'),  e => e.count, cCombo);
  renderDiceTable('tbl-vowels-suf-dice', _diceEntriesFromComboPosition(data.vowelCombinations, 'suffix'), e => e.count, cCombo);

  renderDiceTable('tbl-cons-dice', _diceEntriesFromComboAll(data.consonantCombinations), e => e.count, cComboAll);
  renderDiceTable('tbl-cons-pre-dice', _diceEntriesFromComboPosition(data.consonantCombinations, 'prefix'), e => e.count, cCombo);
  renderDiceTable('tbl-cons-in-dice',  _diceEntriesFromComboPosition(data.consonantCombinations, 'infix'),  e => e.count, cCombo);
  renderDiceTable('tbl-cons-suf-dice', _diceEntriesFromComboPosition(data.consonantCombinations, 'suffix'), e => e.count, cCombo);

  renderDiceTable('tbl-syl-pre-dice', _diceEntriesFromSyllables(syl.prefix), e => e.count, cSyl);
  renderDiceTable('tbl-syl-in-dice',  _diceEntriesFromSyllables(syl.infix),  e => e.count, cSyl);
  renderDiceTable('tbl-syl-suf-dice', _diceEntriesFromSyllables(syl.suffix), e => e.count, cSyl);

  renderDiceTable('tbl-name-syllables-dice', _diceEntriesFromNames(data.names, data.hyphenation), () => 1, cName);
}

// ── Namen-mit-Silben-Tabelle ────────────────────────────────────────
// Leitet die Silben ausschließlich aus dem bereits vorhandenen
// "hyphenation"-Feld des Unified JSON ab (kein zweiter/neuer
// Silbentrennungsalgorithmus, kein zusätzliches JSON-Feld — die
// bestehende Struktur "names"+"hyphenation" reicht aus).
//
// Trennzeichen in "hyphenation" ist die literale Zeichenfolge \- (Backslash
// + Bindestrich), erzeugt von buildEditableHyphenation() in ui.js. Es wird
// ausschließlich auf genau dieser Zeichenfolge gesplittet; alle anderen
// Zeichen (Apostrophe, Bindestriche innerhalb einer Silbe, Umlaute, Akzente,
// Unicode) bleiben unverändert erhalten — kein Verlust, keine neue Regel.
function parseHyphenationToSyllables(hyph) {
  if (typeof hyph !== 'string' || hyph.length === 0) return [];
  return hyph.split(/\\-/);
}

// Silbenpositionen konsistent mit der bestehenden Silbenstatistik-Semantik
// (calcSyllableStats(): erste Silbe = Präfix, letzte Silbe = Suffix, alles
// dazwischen = Infix). Ein-Silben-Namen liefern dieselbe Silbe für Präfix
// UND Suffix, damit sie in der Tabelle nicht verloren geht (Punkt 3).
function _syllablesToRowPositions(syllables) {
  const n = syllables.length;
  if (n === 0) return { prefix: '', infixes: [], suffix: '' };
  if (n === 1) return { prefix: syllables[0], infixes: [], suffix: syllables[0] };
  return { prefix: syllables[0], infixes: syllables.slice(1, n - 1), suffix: syllables[n - 1] };
}

function renderNameSyllableTable(names, hyphenation) {
  const el = document.getElementById('tbl-name-syllables');
  if (!el) return;
  el.innerHTML = '';

  const namesArr = Array.isArray(names) ? names : [];
  const hyphArr  = Array.isArray(hyphenation) ? hyphenation : [];

  if (!namesArr.length) { el.innerHTML = '<p class="text-muted small p-2">Keine Daten.</p>'; return; }

  // names[i] wird immer mit hyphenation[i] kombiniert (1:1, indexgenau).
  const perName = namesArr.map((name, i) => {
    const syllables = parseHyphenationToSyllables(hyphArr[i]);
    return Object.assign({ name }, _syllablesToRowPositions(syllables));
  });

  // Anzahl Infix-Spalten dynamisch aus der größten Silbenzahl über den
  // gesamten Datensatz bestimmen (Punkt 8) — eine gemeinsame Struktur
  // für alle Zeilen, nicht pro Name.
  const maxInfix = perName.reduce((max, r) => Math.max(max, r.infixes.length), 0);

  const headers = ['Name', 'Präfix'];
  for (let i = 1; i <= maxInfix; i++) headers.push(`Infix ${i}`);
  headers.push('Suffix');

  const rows = perName.map(r => {
    const row = [escapeHtml(r.name), escapeHtml(r.prefix)];
    for (let i = 0; i < maxInfix; i++) row.push(escapeHtml(r.infixes[i] || ''));
    row.push(escapeHtml(r.suffix));
    return row;
  });

  el.appendChild(makeCopyTable('tbl-name-syllables-copy', headers, rows));
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

  // Unified-JSON-Import: Datei-Input verdrahten (Punkt 9)
  const jsonImportInput = document.getElementById('json-import-file');
  if (jsonImportInput) jsonImportInput.addEventListener('change', handleJSONImportFile);
});
