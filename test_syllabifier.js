const fs = require('fs');
const vm = require('vm');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'syllableTokenizer.js'), 'utf8');

// Minimal DOM stub for functions that reference document when present
const sandbox = {
	console,
	module: {},
	require,
	window: {},
	document: {getElementById: () => ({value: ''})},
	setTimeout,
};
vm.createContext(sandbox);
vm.runInContext(
	code +
		'\nthis.SyllableTokenizer = (typeof SyllableTokenizer !== "undefined") ? SyllableTokenizer : undefined;',
	sandbox,
);

const SONORITY_HIERARCHY = [
	['a', 'e', 'é', 'o', 'ä', 'ö', 'ü'],
	['i', 'u', 'y'],
	['j', 'w'],
	['l', 'r'],
	['m', 'n', 'ng'],
	['v', 'f', 's', 'z', 'h', 'ch', 'sch', 'th', 'ph'],
	['pf', 'ts', 'tz', 'tsch', 'dz'],
	['b', 'p', 'd', 't', 'g', 'k', 'c', 'ck', 'q'],
];

const vowels = [
	'a',
	'e',
	'i',
	'o',
	'u',
	'y',
	'ä',
	'ö',
	'ü',
	'ie',
	'ei',
	'au',
	'eu',
	'ou',
	'äu',
	'é',
];
const allowedOnsets = [
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
];

const tokenizer = new sandbox.SyllableTokenizer(SONORITY_HIERARCHY, vowels);
const profile = {vowels, allowedOnsets};

const names = [
	'Augustin',
	'Balthasar',
	'Benjamin',
	'Christopher',
	'Christoph',
	'Christoff',
	'Christoph(e)r',
	'Damien',
	'Daniel',
	'Dustin',
	'Edgar',
	'Edmund',
	'Friedrich',
	'Gabriel',
	'Gunther',
	'Gustav',
	'Julien',
	'Justin',
	'Kristof',
	'Kristoff',
	'Kristoph',
	'Lothar',
	'Mathäus',
	'Matthäus',
	'Mikail',
	'Niklas',
	'Patric',
	'Patrick',
	'Patrik',
	'René',
	'Silvester',
	'Sylvester',
	'Thaddäus',
	'Thorsten',
	'Tristan',
	'Walther',
];

for (const n of names) {
	try {
		// Debug selected names
		const DEBUG_NAMES = [
			'Achim',
			'Joachim',
			'Gottfried',
			'Augustin',
			'Yves',
			'Christian',
			'Friedrich',
			'Balthasar',
			'Dustin',
			'Tristan',
			'Christopher',
			'Matthäus',
		];
		if (DEBUG_NAMES.includes(n)) {
			const g = sandbox.tokenizeGraphemes(n.toLowerCase(), tokenizer.graphemes);
			const vals = tokenizer.assignValues(g);
			let s = [];
			let syl = vals[0][0];
			if (n === 'Christopher') {
			}
			for (let i = 0; i < vals.length - 2; i++) {
				const [, pv] = vals[i];
				const [fp, fv] = vals[i + 1];
				const [, nv] = vals[i + 2];
				if (pv > fv && fv < nv) {
					s.push(syl);
					syl = fp;
				} else {
					syl += fp;
				}
			}
			syl += vals.at(-1)[0];
			s.push(syl);
			console.log('DEBUG', n, 'tokens ->', g, 'initial SSP ->', s);
			// apply pipeline cumulatively like tokenizer.tokenize
			let cur = s.slice();
			cur = sandbox.applyStableClusterWhitelist(cur, n);
			console.log(' -> afterStablePrefix', cur);
			cur = sandbox.applyHiatusSplitting(cur, tokenizer.graphemes, profile);
			console.log(' -> afterHiatus', cur);
			cur = sandbox.mergeInitialSemivowelSyllable(cur, profile);
			console.log(' -> afterMergeInit', cur);
			cur = sandbox.applyGeminationSplitting(cur, tokenizer.graphemes, profile);
			console.log(' -> afterGemination', cur);
			cur = sandbox.applySplitMultipleNuclei(cur, tokenizer.graphemes, profile);
			console.log(' -> afterMultiNuclei', cur);
			cur = sandbox.applySPlusPlosiveAdjustment(cur, profile);
			console.log(' -> afterS+Plosive', cur);
			cur = sandbox.applyLiquidOnsetPreference(cur);
			console.log(' -> afterLiquidOnset', cur);
			cur = sandbox.applyNjSplit(cur);
			console.log(' -> afterNj', cur);
			cur = sandbox.applySterSuffixFix(cur);
			console.log(' -> afterSter', cur);
			cur = sandbox.applyStableClusterWhitelist(cur, n);
			console.log(' -> afterStablePrefix2', cur);
			cur = sandbox.applyLatinSuffixSplits(cur);
			console.log(' -> afterLatinSuffix', cur);
			cur = sandbox.mergeConsonantOnlySyllables(cur, profile);
			console.log(' -> afterMergeConsonantOnly', cur);
			cur = sandbox.applyOnsetMaximization(cur, profile);
			console.log(' -> afterOMR', cur);
		}

		const out = tokenizer.tokenize(n, profile);
		console.log(n.padEnd(12), '→', out.join('-'));
	} catch (e) {
		console.error('ERROR on', n, e);
	}
}
