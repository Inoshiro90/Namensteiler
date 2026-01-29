// function extractMorphemes(names, options = {}) {
// 	const {
// 		minLength = 2,
// 		minOccurrences = 2,
// 	} = options;

// 	const morphemeMap = new Map();

// 	// Normalisierte Namen
// 	const normalizedNames = names
// 		.map(n => (typeof n === 'string' ? n.trim().toLowerCase() : ''))
// 		.filter(Boolean);

// 	const normalizedNameSet = new Set(normalizedNames);

// 	// Paarweise Substrings sammeln
// 	for (let i = 0; i < normalizedNames.length; i++) {
// 		for (let j = i + 1; j < normalizedNames.length; j++) {
// 			const substrings = getCommonSubstrings(
// 				normalizedNames[i],
// 				normalizedNames[j],
// 				minLength
// 			);

// 			for (const sub of substrings) {
// 				if (!morphemeMap.has(sub)) {
// 					morphemeMap.set(sub, {
// 						names: new Set(),
// 						positions: { prefix: 0, infix: 0, suffix: 0 },
// 					});
// 				}
// 				morphemeMap.get(sub).names.add(i);
// 				morphemeMap.get(sub).names.add(j);
// 			}
// 		}
// 	}

// 	const result = [];

// 	// Klassifikation + Filter
// 	for (const [morpheme, data] of morphemeMap.entries()) {
// 		// Ausschluss kompletter Namen
// 		if (normalizedNameSet.has(morpheme)) continue;

// 		const occurrences = data.names.size;
// 		if (occurrences < minOccurrences) continue;

// 		// Positionsklassifikation
// 		data.names.forEach(idx => {
// 			const name = normalizedNames[idx];

// 			if (name.startsWith(morpheme)) {
// 				data.positions.prefix++;
// 			} else if (name.endsWith(morpheme)) {
// 				data.positions.suffix++;
// 			} else if (name.includes(morpheme)) {
// 				data.positions.infix++;
// 			}
// 		});

// 		const probability = occurrences / normalizedNames.length;

// 		result.push({
// 			morpheme,
// 			length: morpheme.length,
// 			occurrences,
// 			probability,
// 			positions: data.positions,
// 		});
// 	}

// 	// 🔽 NEUE SORTIERUNG
// 	result.sort((a, b) => {
// 		if (a.length !== b.length) {
// 			return a.length - b.length; // kürzest → längest
// 		}
// 		return b.probability - a.probability; // höhere Wahrscheinlichkeit zuerst
// 	});

// 	return {
// 		morphemes: result,
// 	};
// }

// function extractMorphemes(names, options = {}) {
// 	const {
// 		minLength = 2,
// 		minOccurrences = 2,
// 	} = options;

// 	const normalizedNames = names
// 		.map(n => (typeof n === 'string' ? n.trim().toLowerCase() : ''))
// 		.filter(Boolean);

// 	const nameSet = new Set(normalizedNames);

// 	// morpheme → { names:Set, positions:{prefix,infix,suffix} }
// 	const morphemeMap = new Map();

// 	// Sammeln aller Substrings
// 	for (let i = 0; i < normalizedNames.length; i++) {
// 		for (let j = i + 1; j < normalizedNames.length; j++) {
// 			const subs = getCommonSubstrings(
// 				normalizedNames[i],
// 				normalizedNames[j],
// 				minLength
// 			);

// 			for (const m of subs) {
// 				if (!morphemeMap.has(m)) {
// 					morphemeMap.set(m, {
// 						names: new Set(),
// 						positions: { prefix: 0, infix: 0, suffix: 0 },
// 					});
// 				}
// 				morphemeMap.get(m).names.add(i);
// 				morphemeMap.get(m).names.add(j);
// 			}
// 		}
// 	}

// 	// Klassifikation
// 	for (const [morpheme, data] of morphemeMap.entries()) {
// 		if (nameSet.has(morpheme)) continue;

// 		if (data.names.size < minOccurrences) {
// 			morphemeMap.delete(morpheme);
// 			continue;
// 		}

// 		data.names.forEach(idx => {
// 			const name = normalizedNames[idx];

// 			if (name.startsWith(morpheme)) {
// 				data.positions.prefix++;
// 			} else if (name.endsWith(morpheme)) {
// 				data.positions.suffix++;
// 			} else if (name.includes(morpheme)) {
// 				data.positions.infix++;
// 			}
// 		});
// 	}

// 	// Zielstruktur vorbereiten
// 	const out = {
// 		prefix: {},
// 		infix: {},
// 		suffix: {},
// 	};

// 	// Totals pro Kategorie und Länge
// 	const totals = {
// 		prefix: {},
// 		infix: {},
// 		suffix: {},
// 	};

// 	// Aggregation
// 	for (const [morpheme, data] of morphemeMap.entries()) {
// 		const len = String(morpheme.length);

// 		['prefix', 'infix', 'suffix'].forEach(pos => {
// 			const count = data.positions[pos];
// 			if (count === 0) return;

// 			out[pos][len] = out[pos][len] || {};
// 			out[pos][len][morpheme] = { count };

// 			totals[pos][len] = (totals[pos][len] || 0) + count;
// 			totals[pos]._overall = (totals[pos]._overall || 0) + count;
// 		});
// 	}

// 	// Wahrscheinlichkeiten berechnen + Sortierung
// 	['prefix', 'infix', 'suffix'].forEach(pos => {
// 		Object.keys(out[pos])
// 			.sort((a, b) => Number(a) - Number(b))
// 			.forEach(len => {
// 				const entries = Object.entries(out[pos][len]);

// 				entries
// 					.sort((a, b) => b[1].count - a[1].count)
// 					.forEach(([m, obj]) => {
// 						obj.probOverall = Number(
// 							((obj.count / totals[pos]._overall) * 100).toFixed(2)
// 						);
// 						obj.probByLength = Number(
// 							((obj.count / totals[pos][len]) * 100).toFixed(2)
// 						);
// 					});

// 				out[pos][len] = Object.fromEntries(entries);
// 			});
// 	});

// 	return out;
// }

function extractMorphemes(names, options = {}) {
	const {minLength = 2, minOccurrences = 2} = options;

	const normalizedNames = names
		.map((n) => (typeof n === 'string' ? n.trim().toLowerCase() : ''))
		.filter(Boolean);

	const nameSet = new Set(normalizedNames);

	const vowelSet = window.getVowelSet ? window.getVowelSet() : new Set(['a', 'e', 'i', 'o', 'u']);

	function toCVPattern(str) {
		let pattern = '';
		for (const ch of str) {
			if (vowelSet.has(ch)) pattern += 'V';
			else if (/[a-zäöüß]/i.test(ch)) pattern += 'C';
		}
		return pattern;
	}

	const ALLOWED_CV_PATTERNS = new Set([
// // Nur Vokale
	// 'V',
	// 'VV',
	// 'VVV',

	// // Nur Konsonanten
	// 'C',
	// 'CC',
	// 'CCC',

	// CV*
	'CV',
	'CVV',
	'CVVV',
	'CCV',
	'CCVV',
	'CCVVV',
	// 'CCCV',
	// 'CCCVV',
	// 'CCCVVV',

	// VC*
	'VC',
	'VVC',
	'VVVC',
	'VCC',
	'VVCC',
	'VVVCC',
	// 'VCCC',
	// 'VVCCC',
	// 'VVVCCC',

	// VCV*
	'VCV',
	'VVCV',
	'VVVCV',
	'VCVV',
	'VCVVV',
	'VVCVV',
	'VVCVVV',
	'VVVCVV',
	'VVVCVVV',

	// VCCV*
	'VCCV',
	'VVCCV',
	'VVVCCV',
	'VCCVV',
	'VCCVVV',
	'VVCCVV',
	'VVCCVVV',
	'VVVCCVV',
	'VVVCCVVV',

	// VCCCV*
	// 'VCCCV',
	// 'VVCCCV',
	// 'VVVCCCV',
	// 'VCCCVV',
	// 'VCCCVVV',
	// 'VVCCCVV',
	// 'VVCCCVVV',
	// 'VVVCCCVV',
	// 'VVVCCCVVV',

	// CVC*
	'CVC',
	'CCVC',
	// 'CCCVC',
	'CVCC',
	// 'CVCCC',
	// 'CCVCC',
	// 'CCVCCC',
	// 'CCCVCC',
	// 'CCCVCCC',

	// CVVC*
	'CVVC',
	'CCVVC',
	// 'CCCVVC',
	'CVVCC',
	// 'CVVCCC',
	'CCVVCC',
	// 'CCVVCCC',
	// 'CCCVVCC',
	// 'CCCVVCCC',

	// CVVVC*
	'CVVVC',
	'CCVVVC',
	// 'CCCVVVC',
	'CVVVCC',
	// 'CVVVCCC',
	'CCVVVCC',
	// 'CCVVVCCC',
	// 'CCCVVVCC',
	// 'CCCVVVCCC',
	]);

	// morpheme → { names:Set, positions:{prefix,infix,suffix} }
	const morphemeMap = new Map();

	// Sammeln aller Substrings
	for (let i = 0; i < normalizedNames.length; i++) {
		for (let j = i + 1; j < normalizedNames.length; j++) {
			const subs = getCommonSubstrings(normalizedNames[i], normalizedNames[j], minLength);

			for (const m of subs) {
				if (!morphemeMap.has(m)) {
					morphemeMap.set(m, {
						names: new Set(),
						positions: {prefix: 0, infix: 0, suffix: 0},
					});
				}
				morphemeMap.get(m).names.add(i);
				morphemeMap.get(m).names.add(j);
			}
		}
	}

	// Klassifikation + CV-Filter
	for (const [morpheme, data] of morphemeMap.entries()) {
		if (nameSet.has(morpheme)) {
			morphemeMap.delete(morpheme);
			continue;
		}

		if (data.names.size < minOccurrences) {
			morphemeMap.delete(morpheme);
			continue;
		}

		// const cvPattern = toCVPattern(morpheme);
		// if (!ALLOWED_CV_PATTERNS.has(cvPattern)) {
		// 	morphemeMap.delete(morpheme);
		// 	continue;
		// }
		const cvPattern = toCVPattern(morpheme);
		if (!ALLOWED_CV_PATTERNS.has(cvPattern)) {
			morphemeMap.delete(morpheme);
			continue;
		}

		data.pattern = cvPattern;

		data.names.forEach((idx) => {
			const name = normalizedNames[idx];

			if (name.startsWith(morpheme)) {
				data.positions.prefix++;
			} else if (name.endsWith(morpheme)) {
				data.positions.suffix++;
			} else if (name.includes(morpheme)) {
				data.positions.infix++;
			}
		});
	}

	// Zielstruktur vorbereiten
	const out = {
		prefix: {},
		infix: {},
		suffix: {},
	};

	const totals = {
		prefix: {},
		infix: {},
		suffix: {},
	};

	// Aggregation
	for (const [morpheme, data] of morphemeMap.entries()) {
		const len = String(morpheme.length);

		['prefix', 'infix', 'suffix'].forEach((pos) => {
			const count = data.positions[pos];
			if (count === 0) return;

			out[pos][len] = out[pos][len] || {};
			// out[pos][len][morpheme] = {count};
			out[pos][len][morpheme] = {
				pattern: data.pattern,
				count,
			};

			totals[pos][len] = (totals[pos][len] || 0) + count;
			totals[pos]._overall = (totals[pos]._overall || 0) + count;
		});
	}

	// Wahrscheinlichkeiten + Sortierung
	['prefix', 'infix', 'suffix'].forEach((pos) => {
		Object.keys(out[pos])
			.sort((a, b) => Number(a) - Number(b))
			.forEach((len) => {
				const entries = Object.entries(out[pos][len]);

				entries
					.sort((a, b) => b[1].count - a[1].count)
					.forEach(([m, obj]) => {
						obj.probOverall = Number(
							((obj.count / totals[pos]._overall) * 100).toFixed(2)
						);
						obj.probByLength = Number(
							((obj.count / totals[pos][len]) * 100).toFixed(2)
						);
					});

				out[pos][len] = Object.fromEntries(entries);
			});
	});

	return out;
}
