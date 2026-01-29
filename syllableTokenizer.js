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
	vowels: ['a', 'e', 'i', 'o', 'u', 'y', 'ie', 'ei', 'au', 'eu', 'ou'],
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
		's',
		'st',
		'sp',
		'sch',
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

		return applyOnsetMaximization(syllables, profile);
	}
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
