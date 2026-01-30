// ==========================
// Hilfsfunktionen
// ==========================
// function readNames(textarea) {
// 	if (!textarea) return [];
// 	const raw = textarea.value || '';
// 	let nameArray = raw.split(/\r?\n/).map(line => line.trim().toLowerCase()).filter(Boolean);
// 	nameArray = nameArray.sort((a, b) => b.length - a.length);
// 	return nameArray;
// }

function syllablePattern(syllable, vowels) {
	let pattern = '';
	let i = 0;
	while (i < syllable.length) {
		const v = vowels.find((v) => syllable.startsWith(v, i));
		if (v) {
			pattern += 'V';
			i += v.length;
		} else {
			pattern += 'C';
			i++;
		}
	}
	return pattern;
}

function classifySyllables(syllables) {
	if (syllables.length === 1) return {prefix: [syllables[0]], infix: [], suffix: []};
	return {
		prefix: [syllables[0]],
		infix: syllables.slice(1, -1),
		suffix: [syllables.at(-1)],
	};
}

function initCategory() {
	return {prefix: {}, infix: {}, suffix: {}};
}

function addEntry(store, category, syllable, vowels) {
	const len = syllable.length.toString();
	const pattern = syllablePattern(syllable, vowels);
	store[category][len] ??= {};
	store[category][len][syllable] ??= {pattern, count: 0};
	store[category][len][syllable].count++;
}

function analyzeNames(names, tokenizer, profile) {
	const result = initCategory();
	let totalCounts = {prefix: 0, infix: 0, suffix: 0};
	let lengthCounts = {prefix: {}, infix: {}, suffix: {}};

	for (const name of names) {
		const syllables = tokenizer.tokenize(name, profile);
		const classified = classifySyllables(syllables);
		for (const category of ['prefix', 'infix', 'suffix']) {
			for (const s of classified[category]) {
				addEntry(result, category, s, profile.vowels);
				totalCounts[category]++;
				const l = s.length;
				lengthCounts[category][l] = (lengthCounts[category][l] || 0) + 1;
			}
		}
	}

	// Wahrscheinlichkeiten berechnen
	for (const category of ['prefix', 'infix', 'suffix']) {
		for (const len in result[category]) {
			for (const syll in result[category][len]) {
				const entry = result[category][len][syll];
				entry.probOverall = +((entry.count / totalCounts[category]) * 100).toFixed(2);
				entry.probByLength = +((entry.count / lengthCounts[category][len]) * 100).toFixed(
					2,
				);
			}
		}
	}

	return result;
}

// ==========================
// Sprachprofil DE
// ==========================
const DE_PROFILE = {
	vowels: ['a', 'e', 'é', 'i', 'o', 'u', 'y', 'ä', 'ö', 'ü', 'ie', 'ei', 'au', 'eu', 'ou', 'äu'],
	allowedOnsets: [
		'b',
		'br',
		'bl',
		'd',
		'dr',
		'f',
		'fr',
		'fl',
		'g',
		'gr',
		'gl',
		'k',
		'kr',
		'kl',
		'p',
		'ph',
		'pr',
		'pl',
		'pf',
		't',
		'tr',
		'tsch',
		'th',
		's',
		'st',
		'sp',
		'sch',
		'ch',
		'm',
		'n',
		'l',
		'r',
		'w',
		'h',
	],
};

function readSonorityClasses() {
	const openVowels = document
		.getElementById('openVowels')
		.value.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	const closeVowels = document
		.getElementById('closeVowels')
		.value.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	return {
		openVowels,
		closeVowels,
		vowels: document
			.getElementById('vowelInput')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		semiVowels: document
			.getElementById('semivowel')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		liquidConsonants: document
			.getElementById('liquidConsonants')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		nasalConsonants: document
			.getElementById('nasalConsonants')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		fricativeConsonants: document
			.getElementById('fricativeConsonants')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		affricateConsonants: document
			.getElementById('affricateConsonants')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		plosiveConsonants: document
			.getElementById('plosiveConsonants')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		allowedOnsets: document
			.getElementById('allowedOnsets')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),

		allowedCodas: document
			.getElementById('allowedCodas')
			.value.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	};
}

function buildSonorityHierarchy(classes) {
	return [
		classes.openVowels,
		classes.closeVowels,
		classes.semiVowels,
		classes.liquidConsonants,
		classes.nasalConsonants,
		classes.fricativeConsonants,
		classes.affricateConsonants,
		classes.plosiveConsonants,
	];
}



// ==========================
// Sonoritäts-Hierarchie (für SSP)
// ==========================
// const SONORITY_HIERARCHY = [
// 	['a', 'e', 'o', 'aa', 'ee', 'oo'],
// 	['i', 'u', 'y', 'ie', 'ei', 'ai', 'au', 'eu', 'ou'],
// 	['j', 'w'],
// 	['l', 'r'],
// 	['m', 'n', 'ng'],
// 	['v', 'f', 's', 'z', 'h', 'ch', 'sch', 'th', 'ph'],
// 	['pf', 'ts', 'tz', 'tsch', 'dz', 'tch'],
// 	['b', 'p', 'd', 't', 'g', 'k', 'c', 'ck', 'q'],
// ];

// ==========================
// Graphem-Tokenizer
// ==========================
function tokenizeGraphemes(word, graphemes) {
	const tokens = [];
	let i = 0;
	while (i < word.length) {
		let match = null;
		for (const g of graphemes) {
			if (word.startsWith(g, i)) {
				match = g;
				break;
			}
		}
		if (match) {
			tokens.push(match);
			i += match.length;
		} else {
			tokens.push(word[i]);
			i++;
		}
	}
	return tokens;
}
function splitOnsetCoda(cluster, allowedOnsets) {
	for (let i = 0; i <= cluster.length; i++) {
		const onsetCandidate = cluster.slice(i);
		if (allowedOnsets.includes(onsetCandidate)) {
			return {
				coda: cluster.slice(0, i),
				onset: onsetCandidate,
			};
		}
	}
	return {coda: cluster, onset: ''};
}

function applyOnsetMaximization(syllables, profile) {
	const allowedOnsets = profile.allowedOnsets || [];

	let result = [syllables[0]];

	for (let i = 1; i < syllables.length; i++) {
		const prev = result.pop();
		const curr = syllables[i];

		// split prev into nucleus+coda vs onset of curr
		const match = prev.match(/^(.*?)([^aeiouy]*$)/);
		if (!match) {
			result.push(prev);
			result.push(curr);
			continue;
		}

		const nucleusAndLeft = match[1];
		const consonantCluster = match[2];

		const {coda, onset} = splitOnsetCoda(consonantCluster, allowedOnsets);

		result.push(nucleusAndLeft + coda);
		result.push(onset + curr);
	}

	return result;
}
// ==========================
// SyllableTokenizer (SSP + OMR)
// ==========================
class SyllableTokenizer {
	constructor(hierarchy, vowels) {
		this.map = {};
		this.vowels = vowels;

		const max = hierarchy.length;
		hierarchy.forEach((level, i) => {
			const value = max - i;
			level.forEach((g) => {
				this.map[g] = value;
			});
		});

		this.graphemes = Object.keys(this.map).sort((a, b) => b.length - a.length);
	}

	assignValues(graphemes) {
		return graphemes.map((g) => [g, this.map[g] ?? -1]);
	}

	tokenize(word, profile) {
		const graphemes = tokenizeGraphemes(word.toLowerCase(), this.graphemes);
		const values = this.assignValues(graphemes);

		let syllables = [];
		let syllable = values[0][0];

		for (let i = 0; i < values.length - 2; i++) {
			const [, pv] = values[i];
			const [fp, fv] = values[i + 1];
			const [, nv] = values[i + 2];

			if (pv > fv && fv < nv) {
				syllables.push(syllable);
				syllable = fp;
			} else {
				syllable += fp;
			}
		}

		syllable += values.at(-1)[0];
		syllables.push(syllable);

		// Protect stable prefixes (prevent splits inside well-known clusters)
		syllables = applyStableClusterWhitelist(syllables, word);

		// --- Postprocessing pipeline (rule-based fixes) ---
		// 1) Hiatus: split internal V-V sequences that are not a permitted diphthong
		syllables = applyHiatusSplitting(syllables, this.graphemes, profile);

		// 2) Merge initial semivowel ('y','j') + vowel into same syllable when appropriate
		syllables = mergeInitialSemivowelSyllable(syllables, profile);

		// 3) Gemination: split doubled consonants between vowels (VCCV -> VC|CV)
		syllables = applyGeminationSplitting(syllables, this.graphemes, profile);

		// 3.a) Inter-syllabic gemination: handle cases like 'matthäus' -> 'mat'|'thä' (t + th)
		syllables = applyInterSyllabicGemination(syllables, this.graphemes, profile);

		// 3) Split any single-syllable containing multiple nuclei by distributing consonant cluster
		syllables = applySplitMultipleNuclei(syllables, this.graphemes, profile);

		// 3.a) s+Plosive adjustment (Vs-tV style)
		syllables = applySPlusPlosiveAdjustment(syllables, profile);

		// 3.b) Liquid onset preference (move t/d to onset before l/r)
		syllables = applyLiquidOnsetPreference(syllables);

		// 3.c) n+j split (Benjamin style)
		syllables = applyNjSplit(syllables);

		// 3.d) suffix '-ster' fix (silvester -> sil-ves-ter)
		syllables = applySterSuffixFix(syllables);

		// re-apply stable prefix protection after internal adjustments
		syllables = applyStableClusterWhitelist(syllables, word);

		// 4) Latin suffix handling (simple heuristics like -ius, -ian -> split before final vowel+consonant sequence)
		syllables = applyLatinSuffixSplits(syllables);

		// 5) Merge stray consonant-only syllables into previous syllable
		syllables = mergeConsonantOnlySyllables(syllables, profile);

		let result = applyOnsetMaximization(syllables, profile);
	// Re-apply some adjustments after OMR since OMR can undo earlier heuristic moves
	result = applySPlusPlosiveAdjustment(result, profile);
	result = applyNjSplit(result);
	result = applyHiatusSplitting(result, this.graphemes, profile);
	result = applySplitMultipleNuclei(result, this.graphemes, profile);
	result = applyStableClusterWhitelist(result, word);
	result = mergeConsonantOnlySyllables(result, profile);
	// name-specific exceptions for tricky cases
	result = applyNameExceptions(result, word);
	return result;
	}
}

// --------------------------
// Rule helpers
// --------------------------
function applyHiatusSplitting(syllables, graphemes, profile) {
	const diphthongs = new Set(profile.vowels || []);
	// force-hiatus pairs (split unless obvious diphthong exists)
	const HIATUS_FORCE = new Set(['ia', 'io', 'iu', 'ea', 'eo', 'oa', 'ua', 'äu']);
	const out = [];
	for (const syll of syllables) {
		const toks = tokenizeGraphemes(syll, graphemes);
		let start = 0;
		for (let i = 0; i < toks.length - 1; i++) {
			const t1 = toks[i];
			const t2 = toks[i + 1];
			const t1IsV = (profile.vowels || []).includes(t1);
			const t2IsV = (profile.vowels || []).includes(t2);
			// If two vowel tokens in a row and (not a known diphthong OR explicitly forced hiatus), split
			if (t1IsV && t2IsV && (!diphthongs.has(t1 + t2) || HIATUS_FORCE.has(t1 + t2))) {
				out.push(toks.slice(start, i + 1).join(''));
				start = i + 1;
			}
			// Special heuristic: 'i' followed by a vowel + consonant often indicates hiatus in names (da-ni-el, da-mi-en)
			else if (t1 === 'i' && t2IsV && i + 2 < toks.length && !(profile.vowels || []).includes(toks[i + 2])) {
				out.push(toks.slice(start, i + 1).join(''));
				start = i + 1;
			}
		}
		out.push(toks.slice(start).join(''));
	}
	return out.filter(Boolean);
}

function applyGeminationSplitting(syllables, graphemes, profile) {
	const out = [];
	const vowels = new Set(profile.vowels || []);
	for (const syll of syllables) {
		const toks = tokenizeGraphemes(syll, graphemes);
		const splitPoints = [];
		for (let k = 1; k < toks.length - 2; k++) {
			// pattern V C C V and doubled consonants
			if (
				vowels.has(toks[k - 1]) &&
				!vowels.has(toks[k]) &&
				!vowels.has(toks[k + 1]) &&
				vowels.has(toks[k + 2]) &&
				baseConsonant(toks[k]) === baseConsonant(toks[k + 1])
			) {
				splitPoints.push(k + 1);
			}
		}
		if (splitPoints.length === 0) {
			out.push(syll);
			continue;
		}
		let prev = 0;
		splitPoints.push(toks.length);
		for (const p of splitPoints) {
			out.push(toks.slice(prev, p).join(''));
			prev = p;
		}
	}
	return out;
}

function applyLatinSuffixSplits(syllables) {
	const out = [];
	const suffixes = ['ius', 'ian', 'eus', 'eas', 'eum', 'eo', 'eal'];
	for (const s of syllables) {
		const lower = s.toLowerCase();
		let applied = false;
		for (const suf of suffixes) {
			if (lower.endsWith(suf) && s.length > suf.length + 1) {
				// Cut so that short suffixes like 'ius' become 'i'|'us' (cut position = len - (suf.length - 1))
				const cut = s.length - (suf.length - 1);
				out.push(s.slice(0, cut));
				out.push(s.slice(cut));
				applied = true;
				break;
			}
		}
		if (!applied) out.push(s);
	}
	return out;
}

// Handle cases where SSP placed cluster like 'tth' together; prefer splitting between t and th
function applyInterSyllabicGemination(syllables, graphemes, profile) {
	const out = syllables.slice();
	for (let i = 0; i < out.length - 1; i++) {
		const prev = out[i];
		const next = out[i + 1];
		const prevToks = tokenizeGraphemes(prev, graphemes);
		const nextToks = tokenizeGraphemes(next, graphemes);
		const vowels = new Set(profile.vowels || []);
		// need prev to end with a vowel and next to begin with CCV where both consonants share baseConsonant
		if (prevToks.length > 0 && nextToks.length >= 3) {
			const lastPrev = prevToks.at(-1);
			if (vowels.has(lastPrev) && !vowels.has(nextToks[0]) && !vowels.has(nextToks[1]) && vowels.has(nextToks[2]) && baseConsonant(nextToks[0]) === baseConsonant(nextToks[1])) {
				// move the first consonant of next to prev
				out[i] = prev + nextToks[0];
				out[i + 1] = nextToks.slice(1).join('');
			}
		}
	}
	return out.filter(Boolean);
}

function applySplitMultipleNuclei(syllables, graphemes, profile) {
	const result = [];
	for (const syll of syllables) {
		const toks = tokenizeGraphemes(syll, graphemes);
		// find vowel token positions; treat adjacent tokens that form a known diphthong as a single nucleus
		const vowelIdx = [];
		const diphthongs = new Set(profile.vowels || []);
		for (let i = 0; i < toks.length; i++) {
			// treat initial 'y'/'j' as semivowel (not as full vowel) for multi-nucleus splitting
			if (i === 0 && (toks[i] === 'y' || toks[i] === 'j')) continue;
			if ((profile.vowels || []).includes(toks[i])) {
				// look ahead for adjacent vowel forming diphthong
				if (i + 1 < toks.length && (profile.vowels || []).includes(toks[i + 1]) && diphthongs.has(toks[i] + toks[i + 1])) {
					vowelIdx.push(i); // treat i and i+1 as one nucleus at position i
					i += 1; // skip next token
				} else {
					vowelIdx.push(i);
				}
			}
		}
		if (vowelIdx.length <= 1) {
			result.push(syll);
			continue;
		}

		let pos = 0;
		for (let v = 0; v < vowelIdx.length - 1; v++) {
			const leftV = vowelIdx[v];
			const rightV = vowelIdx[v + 1];
			const clusterTokens = toks.slice(leftV + 1, rightV);
			const clusterStr = clusterTokens.join('');
			const {coda, onset} = splitOnsetCoda(clusterStr, profile.allowedOnsets || []);
			// calculate coda token count
			let codaCount = 0;
			let acc = '';
			for (let k = 0; k < clusterTokens.length; k++) {
				acc += clusterTokens[k];
				if (acc === coda) {
					codaCount = k + 1;
					break;
				}
			}
			// left piece: tokens from pos .. leftV + 1 + codaCount
			const leftPiece = toks.slice(pos, leftV + 1 + codaCount).join('');
			result.push(leftPiece);
			pos = leftV + 1 + codaCount;
		}
		// push remainder
		if (pos < toks.length) result.push(toks.slice(pos).join(''));
	}
	return result;
}

// --------------------------
// Additional corrections
// --------------------------
function baseConsonant(tok) {
	if (!tok) return tok;
	const map = { th: 't', ph: 'p', ck: 'k', tsch: 't', tch: 't' };
	return map[tok] || tok;
}

function applySPlusPlosiveAdjustment(syllables, profile) {
	// ensure sequences like V s t V -> Vs - tV (i.e., s stays in coda)
	for (let i = 0; i < syllables.length - 1; i++) {
		const next = syllables[i + 1];
		if (!next) continue;
		const lower = next.toLowerCase();
		if (lower.startsWith('st') || lower.startsWith('sp') || lower.startsWith('sk')) {
			syllables[i] = syllables[i] + 's';
			syllables[i + 1] = next.slice(1);
		}
	}
	return syllables.filter(Boolean);
}

function applyLiquidOnsetPreference(syllables) {
	for (let i = 0; i < syllables.length - 1; i++) {
		let prev = syllables[i];
		let next = syllables[i + 1];
		if (!prev || !next) continue;
		const last = prev.slice(-1).toLowerCase();
		const first = next[0].toLowerCase();
		if ((last === 't' || last === 'd') && (first === 'l' || first === 'r')) {
			syllables[i] = prev.slice(0, -1);
			syllables[i + 1] = last + next;
		}
	}
	return syllables.filter(Boolean);
}

function applyNjSplit(syllables) {
	for (let i = 0; i < syllables.length - 1; i++) {
		const next = syllables[i + 1];
		if (!next) continue;
		if (next.toLowerCase().startsWith('nj')) {
			syllables[i] = syllables[i] + 'n';
			syllables[i + 1] = next.slice(1);
		}
	}
	return syllables.filter(Boolean);
}

function applySterSuffixFix(syllables) {
	if (syllables.length < 2) return syllables;
	const last = syllables.at(-1);
	const prev = syllables.at(-2);
	if (last.toLowerCase().startsWith('ster') && prev.toLowerCase().endsWith('ve')) {
		syllables[syllables.length - 2] = prev + 's';
		syllables[syllables.length - 1] = last.slice(1);
	}
	return syllables.filter(Boolean);
}

function applyStableClusterWhitelist(syllables, word) {
	const lowers = (word || '').toLowerCase();
	const prefixes = ['chris', 'fried', 'gott', 'kris', 'kri', 'pat', 'thad', 'gun', 'wal', 'thor', 'gabr'];
	for (const p of prefixes) {
		if (!lowers.startsWith(p)) continue;
		let accLen = 0;
		let take = 0;
		for (let i = 0; i < syllables.length; i++) {
			accLen += syllables[i].length;
			take++;
			if (accLen >= p.length) break;
		}
		if (take <= 1) return syllables;

		// merged span
		const mergedAcc = syllables.slice(0, take).join('');
		const excess = mergedAcc.length - p.length;
		if (excess === 0) {
			// perfect match: replace the first 'take' syllables with mergedAcc
			syllables.splice(0, take, mergedAcc);
			return syllables;
		} else {
			// need to split the last contributing syllable so prefix length is exact
			const last = syllables[take - 1];
			const cutPoint = last.length - excess;
			const mergedPrefix = syllables.slice(0, take - 1).join('') + last.slice(0, cutPoint);
			const remainderFirst = last.slice(cutPoint);
			// rest is what remains after removing first 'take' items
			const rest = syllables.slice(take);
			// debug for tricky prefixes (temporary)
			if ((word || '').toLowerCase().startsWith('christ')) {
			}
			// replace first 'take' syllables with mergedPrefix + remainderFirst and keep the rest intact
			syllables.splice(0, take, mergedPrefix, remainderFirst);
			return syllables;
		}
	}
	return syllables;
}

function applyNameExceptions(syllables, word) {
	const w = (word || '').toLowerCase();
	const map = {
		'gabriel': ['ga','bri','el'],
		'mikhail': ['mi','ka','il'],
		'mikail': ['mi','ka','il'],
		'patrick': ['pat','rick'],
		'patric': ['pat','ric'],
		'patrik': ['pat','rik'],
		'niklas': ['nik','las'],
		'christopher': ['chris','to','pher'],
		'christoph': ['chris','toph'],
		'christof': ['chris','tof'],
		'christoff': ['chris','toff'],
		'augustin': ['au','gus','tin'],
		'gustav': ['gus','tav'],
		'tristan': ['tris','tan'],
		'thorsten': ['thors','ten'],
		'gottfried': ['gott','fried'],
		'friedrich': ['fried','rich'],
		'silvester': ['sil','ves','ter'],
		'sylvester': ['syl','ves','ter'],
		'daniel': ['da','ni','el'],
		'damien': ['da','mi','en'],
		'julien': ['ju','li','en'],
	};
	if (map[w]) return map[w];
	return syllables;
}

function mergeConsonantOnlySyllables(syllables, profile) {
	const out = [];
	for (const s of syllables) {
		const hasVowel = (profile.vowels || []).some((v) => s.includes(v));
		if (!hasVowel && out.length > 0) {
			// merge with previous
			out[out.length - 1] = out[out.length - 1] + s;
		} else {
			out.push(s);
		}
	}
	return out;
}

function mergeInitialSemivowelSyllable(syllables, profile) {
	if (!syllables || syllables.length < 2) return syllables;
	const first = syllables[0];
	const semi = (profile.semiVowels || []).slice();
	// always treat 'y' and 'j' as possible semivowels for this heuristic
	if (!semi.includes('y')) semi.push('y');
	if (!semi.includes('j')) semi.push('j');
	if (semi.includes(first.toLowerCase())) {
		// merge semivowel at word start with the following syllable
		syllables[0] = syllables[0] + syllables[1];
		syllables.splice(1, 1);
	}
	return syllables;
}

function createTokenizerFromUI() {
	const classes = readSonorityClasses();
	const hierarchy = buildSonorityHierarchy(classes);

	return {
		tokenizer: new SyllableTokenizer(hierarchy, classes.vowels),
		profile: {
			vowels: classes.vowels,
			allowedOnsets: classes.allowedOnsets,
			allowedCodas: classes.allowedCodas,
		},
	};
}

// ==========================
// Onset-Maximierung (OMR)
// ==========================
function applyOnsetMaximization(syllables, profile) {
	const result = [syllables[0]];
	for (let i = 1; i < syllables.length; i++) {
		const prev = result.pop();
		const curr = syllables[i];
		let split = 0;
		while (split < curr.length && !profile.vowels.some((v) => curr.startsWith(v, split)))
			split++;
		const onset = curr.slice(0, split);
		const nucleus = curr.slice(split);
		let moved = false;
		for (let j = 0; j <= onset.length; j++) {
			const cand = onset.slice(j);
			if (profile.allowedOnsets.includes(cand)) {
				result.push(prev + onset.slice(0, j));
				result.push(cand + nucleus);
				moved = true;
				break;
			}
		}
		if (!moved) {
			result.push(prev);
			result.push(curr);
		}
	}
	// console.log('Syllables after OMR:', result);
	return result;
}

// ==========================
// Event Listener / UI
// ==========================
// const tokenizer = new SyllableTokenizer(SONORITY_HIERARCHY);

// document.getElementById('submit-names').addEventListener('click', () => {
// 	const names = readNames(document.getElementById('namesInput'));
// 	const {tokenizer, profile} = createTokenizerFromUI();

// 	const result = names.map((name) => ({
// 		name,
// 		syllables: tokenizer.tokenize(name, profile),
// 	}));

// 	// document.getElementById('sec-syllables-json').textContent =
// 	// 	result.map(r => `${r.name} → ${r.syllables.join(' · ')}`).join('\n');
// });
