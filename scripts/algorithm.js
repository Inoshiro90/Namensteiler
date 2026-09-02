'use strict';

/**
 * algorithm.js — Namensteiler Kernalgorithmus
 *
 * Implementiert graphembasierte, sonoritätsgesteuerte Silbentrennung (SSP).
 *
 * Änderungshistorie:
 *  v1.1 (2026-05): Unicode-Fixes
 *    - FIX-A: NFC-Normalisierung in parseWord(), morphemeSegment(), readClasses()
 *    - FIX-B: İ (U+0130) korrekt vor toLowerCase() behandeln
 *    - FIX-C: normalizeWordInternals() normalisiert Apostroph-Varianten + Unicode-Bindestriche
 *    - FIX-D: Boundary-Sentinel (son=-1) für Apostrophe/Bindestriche/Spaces;
 *             SONORITY_UNKNOWN_CONSONANT=1 für unbekannte Buchstaben (statt son=0)
 *
 * @see ui.js für analyze() und resolveWordBoundaries()
 */

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
// Hinweis: _maxOnsetLength/_maxCodaLength sind Aliases – aktiv sind _maxOnsetLen/_maxCodaLen
let _maxOnsetLen = 0;  // 0 = unbegrenzt
let _maxCodaLen  = 0;  // 0 = unbegrenzt
// Sprachspezifische Orthographie-Zusatzregeln (nur fuer passende Profile
// aktiv, z.B. Englisch/Amerikanisch). Default false = Regel deaktiviert,
// damit Profile ohne diese Konventionen (fast alle anderen) unveraendert
// bleiben.
let _silentFinalE = false;         // "magic e": Kate, Blake, James (stumm)
let _glideVowelPositional = false; // y/w als Vokal: Ryan/Bryan vs Yasmin/Kenya

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

async function applyProfile(profileId) {
  const profile = await loadProfile(profileId);
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
  _silentFinalE = !!profile.silentFinalE;
  _glideVowelPositional = !!profile.glideVowelPositional;
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
  const _pdEl = document.getElementById('profile-desc');
  if (_pdEl) _pdEl.textContent = profile.desc;
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
      // FIX-A: NFC-Normalisierung verhindert NFD-Mismatch bei macOS-Eingaben.
      // Grapheme werden NFC-normalisiert gespeichert, damit sie gegen
      // NFC-normalisierte Inputs in parseWord() matchen können.
      .split(',').map(g => g.trim().normalize('NFC').toLowerCase()).filter(g => g),
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
  // FIX-A+B: NFC-Normalisierung + İ-Fix (U+0130 → i), konsistent mit parseWord().
  // Ohne NFC: macOS-NFD-Eingaben schlagen beim Präfix-Matching fehl.
  // Ohne İ-Fix: türkische Namen mit İ am Anfang erzeugen i\u0307 (2 Zeichen) beim
  // toLowerCase() – kein Morphem-Match möglich.
  const lower = word.normalize('NFC').replace(/İ/g, 'i').toLowerCase();
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

// ─── SONORITY SENTINELS ───────────────────────────────────────────────
// SONORITY_BOUNDARY: Apostroph, Unicode-Bindestrich, Soft-Hyphen, Leerzeichen.
// Wert < 0 → syllabify() erzeugt an dieser Stelle eine Pflicht-Silbengrenze,
// ohne den SSP-Algorithmus zu beeinflussen.
const SONORITY_BOUNDARY = -1;

// SONORITY_UNKNOWN_CONSONANT: Unbekannte Buchstaben bekommen die niedrigste
// echte Konsonanten-Sonorität (= stimmlose Plosive). Das ist konservativ und
// verhindert, dass unbekannte Zeichen den Onset nach links verschieben.
// Früher war der Wert 0, was UNTER allen definierten Klassen lag und den
// SSP systematisch korrumpierte.
const SONORITY_UNKNOWN_CONSONANT = 1;

/**
 * Normalisiert wortinterne Sonderzeichen VOR dem Parsing:
 * - NFC-Normalisierung (macOS/NFD-Clipboard-Schutz)
 * - Alle Apostroph-Varianten → ASCII-Apostroph U+0027
 * - Unicode-Bindestriche und Soft-Hyphen → ASCII-Bindestrich U+002D
 *
 * Muss VOR parseWord() aufgerufen werden, damit die Graphem-Logik stabile,
 * vorhersehbare Inputs bekommt. Ohne diese Normalisierung würde z.B.
 * U+2019 (typografischer Apostroph) nicht als Boundary erkannt.
 *
 * @param {string} word  Roheingabe
 * @returns {string}     Normalisierter String
 */
function normalizeWordInternals(word) {
  return word
    .normalize('NFC')
    // Apostroph-Normalisierung: alle semantisch gleichen Varianten → U+0027
    // Betrifft: typografische Apostrophe, Modifier-Apostroph, Armenisch etc.
    .replace(/[\u2018\u2019\u201A\u201B\u02BC\u02BB\u055A\u07F4\u07F5\uFF07]/g, "'")
    // Unicode-Bindestriche → ASCII-Bindestrich
    // Betrifft: Soft-Hyphen, Non-breaking Hyphen, En/Em/Horizontal-Bar, etc.
    .replace(/[\u00AD\u2010\u2011\u2012\u2013\u2014\u2015\uFE58\uFE63\uFF0D]/g, '-');
}

// ─── BOUNDARY-ZEICHEN-ERKENNUNG ───────────────────────────────────────
// Wird nach normalizeWordInternals() aufgerufen, daher nur ASCII-Varianten nötig.
// Testet das NFC-normalisierte Zeichen, nicht den Rohstring.
const _BOUNDARY_CHAR_RE = /[\u0027\u002D\u00AD\u2010-\u2015\s]/;

function parseWord(word, gmap, vowelMin, profileFlags) {
  if (vowelMin == null) vowelMin = 11;
  // profileFlags: optionale sprachspezifische Zusatzregeln, die NUR fuer
  // Profile mit passender Orthographie aktiviert werden duerfen. Ohne
  // uebergebenes Flag-Objekt bleiben alle Zusatzregeln deaktiviert - das
  // ist wichtig, da sonst z.B. die "magic e"-Regel (silentFinalE) faelschlich
  // auf Profile ohne stummes End-e (fast alle Nicht-Englisch-Profile)
  // angewendet wuerde und dort echte Vokale verschluckt (Regression!).
  if (profileFlags == null) profileFlags = {};
  const silentFinalE = !!profileFlags.silentFinalE;
  const glideVowelPositional = !!profileFlags.glideVowelPositional;
  const { map, classMap, sorted } = gmap;
  // FIX-A: NFC-Normalisierung stellt sicher, dass macOS/NFD-Clipboard-Eingaben
  // (z.B. "Gonza\u0301lez" statt "González") gegen Profil-Grapheme matchen.
  // FIX-B: İ (U+0130) → 'i' VOR toLowerCase(), da toLowerCase() allein
  // "İ" zu "i\u0307" (2 Zeichen!) macht und das Parsing bricht.
  const wordNFC = word.normalize('NFC');
  const lower = wordNFC.replace(/İ/g, 'i').toLowerCase();
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
        // Vokal-Glide-Digraph-Lookahead (z. B. ay/ey/oy): ein zweistelliges
        // Graphem, das als Vokal/Peak klassifiziert ist (map[g] >= vowelMin),
        // dessen zweiter Buchstabe aber ALLEIN ein eigenstaendiger Konsonant
        // waere (map[letzterBuchstabe] < vowelMin), ist ein Vokal+Glide-Diphthong
        // (Gleitlaut als Koda). Folgt darauf ein weiterer Vokal, gehoert der
        // Glide phonologisch als Onset zur naechsten Silbe und darf NICHT mit
        // dem vorausgehenden Vokal verschmolzen werden (sonst z. B. Azeri
        // "Mirzayeva" -> "Mir-zay-e-va" statt korrekt "Mir-za-ye-va").
        // Zweiter Fall: In manchen Profilen (z.B. Bulgarisch) ist der Gleitlaut
        // (z.B. 'y') selbst als Vokal klassifiziert, weil er auch eigenstaendig
        // als Vokal vorkommt (Kyril, Krystina). Dort greift obige Bedingung
        // nicht (lastChSon ist kein Konsonant). Stattdessen wird geprueft, ob
        // der Gleitlaut zusammen mit dem folgenden Buchstaben selbst ein
        // bekanntes Onset-Glide+Vokal-Graphem bildet (z.B. 'y'+'a' = 'ya').
        // Ist das der Fall, gehoert der Gleitlaut ebenfalls zur naechsten
        // Silbe (sonst z.B. Bulgarisch "Boyan" -> "Boy-an" statt korrekt
        // "Bo-yan", "Sofiya" -> "So-fiy-a" statt korrekt "So-fi-ya").
        // WICHTIG: Nur fuer echte Halbvokal-/Gleitlaut-Buchstaben (y, w) -
        // sonst feuert die Regel faelschlich bei zufaelliger Vokal+Vokal-
        // Nachbarschaft (z.B. Belgisch "ou"+"ui" oder Bengali "ya"+"aa"),
        // wo der zweite Buchstabe ein voller Vokal und kein Gleitlaut ist.
        if (g.length === 2 && map[g] >= vowelMin) {
          const lastCh = g[1];
          const lastChSon = map[lastCh];
          const nextCh = lower[i + g.length] || '';
          const nextSon = map[nextCh];
          const soloConsonantCase = lastChSon !== undefined && lastChSon < vowelMin
            && nextSon !== undefined && nextSon >= vowelMin;
          const isGlideLetter = lastCh === 'y' || lastCh === 'w';
          const glideOnsetCombo = lastCh + nextCh;
          const glideOnsetSon = map[glideOnsetCombo];
          const glideOnsetCase = isGlideLetter && glideOnsetCombo.length === 2
            && glideOnsetSon !== undefined && glideOnsetSon >= vowelMin;
          if (soloConsonantCase || glideOnsetCase) {
            continue;
          }
          // Onset-Glide-als-Vokal-Positionscheck (z. B. Englisch: 'y' ist
          // selbst als Vokal klassifiziert, map['y'] >= vowelMin). Ein
          // Graphem wie "ya"/"ye"/"yo" (Gleitlaut+Vokal) darf nur dann als
          // EIN Silbenkern verschmolzen werden, wenn der Gleitlaut dort
          // tatsaechlich als Onset-Konsonant fungiert - das ist der Fall
          // (a) am absoluten Wortanfang (z. B. "Yasmin", "Yolanda") oder
          // (b) wenn im Wort bereits ein frueherer Vokal-Peak existiert,
          // sodass der Gleitlaut die naechste Silbe eroeffnet (z. B.
          // "Kenya", "Tanya", "Anya", "Freya"). Fehlt beides - der
          // Gleitlaut folgt direkt auf einen Konsonanten-Cluster ohne
          // vorherigen Vokal im Wort (z. B. "Bryan", "Ryan", "Dyer",
          // "Hyacinth", "Lyon") - fungiert der Gleitlaut phonetisch selbst
          // als Vokalkern der ERSTEN Silbe und darf NICHT mit dem
          // folgenden Vokal verschmolzen werden (sonst "Ryan" -> 1 Silbe
          // statt korrekt "Ry-an").
          const firstCh = g[0];
          const firstChSon = map[firstCh];
          const isGlideFirstVowelCase = glideVowelPositional
            && (firstCh === 'y' || firstCh === 'w')
            && firstChSon !== undefined && firstChSon >= vowelMin;
          if (isGlideFirstVowelCase) {
            const hasEarlierVowelPeak = segments.some(s => s.sonority >= vowelMin);
            if (i !== 0 && !hasEarlierVowelPeak) {
              continue;
            }
          }
        }
        // Wortende-Check fuer "dge" (Englisch): das Graphem "dge" (fuer den
        // Konsonanten /dʒ/, z. B. "bridge", "edge", "judge") ist nur dann
        // eine EINZELNE Konsonanteneinheit mit stummem e, wenn es tatsaechlich
        // am Wortende steht. Folgt danach noch ein Buchstabe (z. B. "Bridget",
        // "Badger", "Bridges", "Dodgen"), ist das 'e' ein echter, ausgesprochener
        // Vokal einer eigenen Silbe - "dge" darf dann NICHT als Einheit
        // gematcht werden, sondern muss in d+g+e zerfallen (sonst "Bridget"
        // -> 1 Silbe statt korrekt "Brid-get").
        if (g === 'dge') {
          const isWordFinal = (i + g.length === lower.length);
          if (!isWordFinal) {
            continue;
          }
        }
        // "Magic e" / stummes End-e (Englisch): ein finales 'e' nach dem
        // Muster [Vokal][einzelner Konsonant]e$ (z. B. "Kate", "Blake",
        // "James", "Rose", "Luke") ist in der englischen Orthographie
        // grundsaetzlich stumm und bildet KEINE eigene Silbe - unabhaengig
        // davon, ob es den vorausgehenden Vokal "verlaengert" oder nicht
        // (auch "have", "give", "office" folgen dieser Schreibkonvention).
        // Erkennung: 'e' ist das letzte Zeichen des Wortes, das direkt
        // vorausgehende Segment ist ein EINZELNES Konsonanten-Zeichen
        // (kein Digraph wie "th"/"dge"/"ck" - deren eigene Wortende-Logik
        // greift bereits separat), und davor steht ein einzelnes Vokal-
        // Zeichen (kein Digraph wie "ai"/"ee", die bereits eigene
        // Silbenkerne bilden). Das stumme 'e' wird als eigenes Segment mit
        // niedriger, nicht-Peak-Sonoritaet (0) angehaengt, damit es Teil
        // der letzten Silbe bleibt, aber keine neue Silbe eroeffnet.
        // Bekannte Grenzfaelle: griechischstaemmige Namen mit ausgesprochenem
        // End-e nach genau diesem Muster (z. B. "Penelope", "Hermione")
        // werden dadurch faelschlich verkuerzt - ohne Ausspracheliste nicht
        // sicher unterscheidbar vom regulaeren Muster.
        if (silentFinalE && g === 'e' && i === lower.length - 1 && i >= 2) {
          const prevSeg = segments[segments.length - 1];
          const prevPrevSeg = segments[segments.length - 2];
          const prevIsSingleConsonant = prevSeg && prevSeg.text.length === 1
            && prevSeg.sonority !== undefined && prevSeg.sonority < vowelMin && prevSeg.sonority >= 0;
          const prevPrevIsSingleVowel = prevPrevSeg && prevPrevSeg.text.length === 1
            && prevPrevSeg.sonority !== undefined && prevPrevSeg.sonority >= vowelMin;
          if (prevIsSingleConsonant && prevPrevIsSingleVowel) {
            segments.push({ text: wordNFC.slice(i, i + 1), grapheme: 'e', sonority: 0, className: 'Stummes e' });
            i += 1;
            matched = true;
            break;
          }
        }
        // Steigender-Diphthong-Hiatus-Check fuer 'ie'
        if (g === 'ie') {
          const nc  = i + 2 < lower.length ? lower[i + 2] : '';
          const nnc = i + 3 < lower.length ? lower[i + 3] : '';
          if (_IE_SONORANTS.has(nc) && (nnc === '' || _IE_VOWELS.has(nnc))) {
            continue;  // 'ie' ueberspringen -> i + e werden einzeln gematcht
          }
        }
        // Kontextabhaengige Y-Vokalisierung:
        // In Profilen, die blankes 'y' als Konsonant/Glide fuehren (z.B. Bantu:
        // Klasse 10 wie 'j'), kann ein Wort ohne weiteren Vokal keine Silbe
        // bilden, obwohl 'y' dort phonetisch als Vokalnukleus fungiert
        // (Lehnnamen wie "Mary", "Lydia", "Gladys", "Mercy", "Chitty", "Thuty").
        // Das betrifft nur 'y' NACH einem Konsonanten (oder am Wortanfang) UND
        // OHNE folgenden Vokal (Wortende oder Konsonant danach). Steht vor 'y'
        // dagegen ein Vokal, bildet "Vokal+y" einen fallenden Diphthong/Offglide
        // (z.B. "Joy-ce", "Tha-ney") - dort bleibt 'y' unveraendert Konsonant/
        // Koda. Vor einem Vokal (z.B. "ya"/"yu"/"yo"-Kontexte) bleibt 'y'
        // ebenfalls Konsonant/Onset. Profile, die 'y' bereits direkt der
        // Vokalklasse zuordnen (Englisch, Schottisch, Irisch, ...), durchlaufen
        // diesen Zweig nie, da dort map['y'] >= vowelMin ist.
        if (g === 'y' && map[g] < vowelMin) {
          const afterY = i + 1;
          let nextIsVowel = false;
          for (const g2 of sorted) {
            if (map[g2] >= vowelMin && lower.slice(afterY, afterY + g2.length) === g2) { nextIsVowel = true; break; }
          }
          const prevSeg = segments[segments.length - 1];
          const prevIsVowel = prevSeg && prevSeg.sonority >= vowelMin;
          if (!nextIsVowel && !prevIsVowel) {
            const iKey = sorted.find(k => k === 'i');
            const vSon = iKey ? map[iKey] : vowelMin;
            const vCls = iKey ? classMap[iKey] : 'Vokal';
            segments.push({ text: wordNFC.slice(i, i + 1), grapheme: 'y', sonority: vSon, className: vCls });
            i += 1;
            matched = true;
            break;
          }
        }
        // Geminate auto-split: CONSONANT geminates only (sonority < 11)
        // Vowel digraphs like aa/ee/oo/uu/ii keep their long-vowel identity
        if (g.length === 2 && g[0] === g[1] && map[g] < 11) {
          const son = map[g], cls = classMap[g];
          segments.push({ text: wordNFC.slice(i,     i+1), grapheme: g[0], sonority: son, className: cls });
          segments.push({ text: wordNFC.slice(i+1, i+2), grapheme: g[0], sonority: son, className: cls });
        } else {
          segments.push({ text: wordNFC.slice(i, i+g.length), grapheme: g, sonority: map[g], className: classMap[g] });
        }
        i += g.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = wordNFC[i];
      // FIX-D: Boundary-Zeichen (Apostrophe, Bindestriche, Leerzeichen) erhalten
      // den Sentinel-Wert SONORITY_BOUNDARY = -1. syllabify() erzeugt dort
      // eine Pflicht-Silbengrenze ohne den SSP-Algorithmus zu beeinflussen.
      //
      // Unbekannte Buchstaben erhalten SONORITY_UNKNOWN_CONSONANT = 1 (niedrigste
      // echte Konsonanten-Klasse). Früher war der Wert 0 – das lag UNTER allen
      // definierten Klassen und zog Onsets systematisch nach links (BUG-3).
      const isBoundaryChar = _BOUNDARY_CHAR_RE.test(ch);
      const sonority = isBoundaryChar ? SONORITY_BOUNDARY : SONORITY_UNKNOWN_CONSONANT;
      // Aenderung 4: Boundary-Fallback heisst 'Sonderzeichen' (nicht Sonderzeichen-Icon)
      const className = isBoundaryChar ? 'Sonderzeichen' : '?';
      segments.push({ text: ch, grapheme: ch.toLowerCase(), sonority, className });
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

    // ── FIX-D: BOUNDARY-SENTINEL (son < 0) → PFLICHT-SILBENGRENZE ────────────
    // Zeichen mit son < 0 sind Apostrophe, Bindestriche oder Leerzeichen, die
    // nach normalizeWordInternals() noch im Segment-Array stehen.
    // Wir setzen die Silbengrenze auf das erste Segment NACH dem Boundary-Zeichen.
    // Das entspricht dem natürlichen Verhalten: O'Con-nor → Grenze nach dem '.
    // Die bestehende Space-Behandlung (Zeile 281) wird damit durch diese
    // allgemeinere Logik ersetzt und ist kein Dead Code mehr.
    let forcedBoundary = -1;
    for (let k = left + 1; k < right; k++) {
      if (vals[k] < 0) {
        forcedBoundary = Math.min(k + 1, right);
        break;
      }
      cluster.push(k);
    }
    if (forcedBoundary >= 0) {
      boundaries.add(forcedBoundary);
      continue;
    }

    if (cluster.length === 0) { boundaries.add(right); continue; }

    // ── LEERZEICHEN = OBLIGATORISCHE SILBENGRENZE (jetzt über forcedBoundary) ─
    // Dieser Block ist ab sofort redundant (Leerzeichen haben son=-1 und werden
    // oben abgefangen), bleibt aber als Sicherheitsnetz für direkte Aufrufer.
    const spaceInCluster = cluster.findIndex(k => segments[k].grapheme === ' ');
    if (spaceInCluster !== -1) {
      const nextAfterSpace = cluster[spaceInCluster + 1] ?? right;
      boundaries.add(nextAfterSpace);
      continue;
    }
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

