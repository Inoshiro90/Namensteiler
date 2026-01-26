(function () {
	function calculateVowelConsonantDistribution(positions) {
		if (!Array.isArray(positions)) return [];

		const vowels =
			typeof window !== 'undefined' && typeof window.getVowelSet === 'function'
				? window.getVowelSet()
				: new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);

		return positions.map((pos) => {
			const letters = Array.isArray(pos.letters) ? pos.letters : [];
			const total = letters.length;

			let vowelCount = 0,
				consonantCount = 0,
				emptyCount = 0,
				otherCount = 0;
			const vowelBreakdown = {};
			const consonantBreakdown = {};

			letters.forEach((l) => {
				const raw = typeof l === 'string' ? l : String(l);
				const trimmed = raw.trim();
				if (trimmed === '') {
					emptyCount++;
					return;
				}
				const key = trimmed.toLowerCase();
				const isLetter = /^[a-zäöüß]$/i.test(key);
				if (!isLetter) {
					otherCount++;
					return;
				}
				if (vowels.has(key)) {
					vowelCount++;
					vowelBreakdown[key] = (vowelBreakdown[key] || 0) + 1;
				} else {
					consonantCount++;
					consonantBreakdown[key] = (consonantBreakdown[key] || 0) + 1;
				}
			});

			const probabilities = {
				vowel: vowelCount / total,
				consonant: consonantCount / total,
				empty: emptyCount / total,
				other: otherCount / total,
			};

			const vowelProbs = {};
			Object.keys(vowelBreakdown).forEach((k) => {
				vowelProbs[k] = vowelBreakdown[k] / total;
			});
			const consonantProbs = {};
			Object.keys(consonantBreakdown).forEach((k) => {
				consonantProbs[k] = consonantBreakdown[k] / total;
			});

			const vowelProbsNormalized = {};
			if (vowelCount > 0) {
				Object.keys(vowelBreakdown).forEach((k) => {
					vowelProbsNormalized[k] = vowelBreakdown[k] / vowelCount;
				});
			}
			const consonantProbsNormalized = {};
			if (consonantCount > 0) {
				Object.keys(consonantBreakdown).forEach((k) => {
					consonantProbsNormalized[k] = consonantBreakdown[k] / consonantCount;
				});
			}

			return {
				position: pos.position,
				total,
				counts: {
					vowel: vowelCount,
					consonant: consonantCount,
					empty: emptyCount,
					other: otherCount,
				},
				probabilities,
				vowelBreakdown,
				consonantBreakdown,
				vowelProbs,
				consonantProbs,
				vowelProbsNormalized,
				consonantProbsNormalized,
			};
		});
	}

	function displayVowelConsonantDistribution(distArray, containerId = 'results') {
		const container = document.getElementById(containerId);
		if (!container) return;

		const header = document.createElement('h3');
		header.textContent = 'Vokale / Konsonanten Verteilung';
		container.appendChild(header);

		if (!Array.isArray(distArray) || distArray.length === 0) {
			const p = document.createElement('p');
			p.textContent = 'Keine Daten.';
			container.appendChild(p);
			return;
		}

		distArray.forEach((pos) => {
			const h4 = document.createElement('h4');
			h4.textContent = `Position ${pos.position} (Gesamt: ${pos.total})`;
			container.appendChild(h4);

			const summary = document.createElement('div');
			summary.innerHTML = `Vokale: ${(pos.probabilities.vowel * 100).toFixed(2)}% (${
				pos.counts.vowel
			}) &nbsp; Konsonanten: ${(pos.probabilities.consonant * 100).toFixed(2)}% (${
				pos.counts.consonant
			}) &nbsp; Leer: ${(pos.probabilities.empty * 100).toFixed(2)}% (${pos.counts.empty})`;
			container.appendChild(summary);

			const vKeys = Object.keys(pos.vowelBreakdown || {});
			if (vKeys.length > 0) {
				const vh = document.createElement('h5');
				vh.textContent = 'Vokale (Verhältnis untereinander)';
				container.appendChild(vh);
				const vt = document.createElement('table');
				vt.className = 'table table-sm';
				const vbody = document.createElement('tbody');
				vKeys.sort((a, b) => (pos.vowelBreakdown[b] || 0) - (pos.vowelBreakdown[a] || 0));
				vKeys.forEach((k) => {
					const tr = document.createElement('tr');
					const tdL = document.createElement('td');
					tdL.textContent = k;
					const tdC = document.createElement('td');
					tdC.textContent = String(pos.vowelBreakdown[k]);
					const tdP = document.createElement('td');
					const relative = pos.vowelProbsNormalized && (pos.vowelProbsNormalized[k] || 0);
					tdP.textContent = (relative * 100).toFixed(2);
					tr.appendChild(tdL);
					tr.appendChild(tdC);
					tr.appendChild(tdP);
					vbody.appendChild(tr);
				});
				vt.appendChild(vbody);
				container.appendChild(vt);
			}

			const cKeys = Object.keys(pos.consonantBreakdown || {});
			if (cKeys.length > 0) {
				const ch = document.createElement('h5');
				ch.textContent = 'Konsonanten (Verhältnis untereinander)';
				container.appendChild(ch);
				const ct = document.createElement('table');
				ct.className = 'table table-sm';
				const cbody = document.createElement('tbody');
				cKeys.sort(
					(a, b) => (pos.consonantBreakdown[b] || 0) - (pos.consonantBreakdown[a] || 0)
				);
				cKeys.forEach((k) => {
					const tr = document.createElement('tr');
					const tdL = document.createElement('td');
					tdL.textContent = k;
					const tdC = document.createElement('td');
					tdC.textContent = String(pos.consonantBreakdown[k]);
					const tdP = document.createElement('td');
					const relative =
						pos.consonantProbsNormalized && (pos.consonantProbsNormalized[k] || 0);
					tdP.textContent = (relative * 100).toFixed(2);
					tr.appendChild(tdL);
					tr.appendChild(tdC);
					tr.appendChild(tdP);
					cbody.appendChild(tr);
				});
				ct.appendChild(cbody);
				container.appendChild(ct);
			}
		});
	}

	if (typeof window !== 'undefined') {
		window.calculateVowelConsonantDistribution = calculateVowelConsonantDistribution;
		window.displayVowelConsonantDistribution = displayVowelConsonantDistribution;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {calculateVowelConsonantDistribution, displayVowelConsonantDistribution};
	}
})();

(function () {
	/**
	 * Berechnet häufige Vokal- und Konsonantenkombinationen (zusammenhängende Runs) aus einem Namen-Array.
	 * Liefert gruppiert nach Länge: [{ length, total, counts: { combo: count }, probabilities: { combo: prob } }, ...]
	 * @param {string[]} nameArray
	 * @returns {{vowels:Array, consonants:Array}}
	 */
	function calculateLetterCombinations(nameArray) {
		if (!Array.isArray(nameArray)) return {vowels: [], consonants: []};
		const vowelSet =
			typeof window !== 'undefined' && typeof window.getVowelSet === 'function'
				? window.getVowelSet()
				: new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
		const isLetterRe = /^[a-zäöüß]$/i;

		const vGroups = {}; // length -> { total, counts }
		const cGroups = {};
		const namesByLen = {}; // length -> number of names of that length

		nameArray.forEach((raw) => {
			const s = typeof raw === 'string' ? raw.trim() : '';
			if (s.length === 0) return;
			const chars = [...s];
			const ln = chars.length;
			namesByLen[ln] = (namesByLen[ln] || 0) + 1;
			let run = '';
			let runType = null; // 'v' or 'c'
			let runStart = -1;
			// track which pattern+position combos we've already counted for this name
			const seenV = new Set();
			const seenC = new Set();
			const flushRun = () => {
				if (!run || !runType) return;
				const key = run.toLowerCase();
				const len = key.length;
				// determine position: only count as prefix/infix/suffix when neighboring characters match user's rules
				// runStart is start index, runEnd is runStart + len - 1
				const runEnd = runStart + len - 1;

				const charBefore = runStart > 0 ? String(chars[runStart - 1]).toLowerCase() : null;
				const charAfter =
					runEnd < chars.length - 1 ? String(chars[runEnd + 1]).toLowerCase() : null;
				const isLetterBefore = charBefore !== null ? isLetterRe.test(charBefore) : false;
				const isLetterAfter = charAfter !== null ? isLetterRe.test(charAfter) : false;
				const beforeIsVowel = isLetterBefore && vowelSet.has(charBefore);
				const afterIsVowel = isLetterAfter && vowelSet.has(charAfter);

				let posType = null;
				if (runStart === 0 && runEnd < chars.length - 1) {
					// candidate prefix: require following char of opposite type
					if (runType === 'v' && isLetterAfter && !afterIsVowel) posType = 'prefix';
					if (runType === 'c' && isLetterAfter && afterIsVowel) posType = 'prefix';
				} else if (runEnd === chars.length - 1 && runStart > 0) {
					// candidate suffix: require preceding char of opposite type
					if (runType === 'v' && isLetterBefore && !beforeIsVowel) posType = 'suffix';
					if (runType === 'c' && isLetterBefore && beforeIsVowel) posType = 'suffix';
				} else if (runStart > 0 && runEnd < chars.length - 1) {
					// candidate infix: require both neighbors of opposite type
					if (
						runType === 'v' &&
						isLetterBefore &&
						isLetterAfter &&
						!beforeIsVowel &&
						!afterIsVowel
					)
						posType = 'infix';
					if (
						runType === 'c' &&
						isLetterBefore &&
						isLetterAfter &&
						beforeIsVowel &&
						afterIsVowel
					)
						posType = 'infix';
				}

				if (posType) {
					if (runType === 'v') {
						const seenKey = `${key}|${posType}`;
						if (!seenV.has(seenKey)) {
							seenV.add(seenKey);
							if (!vGroups[len]) vGroups[len] = {total: 0, counts: {}};
							if (!vGroups[len].counts[key])
								vGroups[len].counts[key] = {
									total: 0,
									positions: {prefix: 0, infix: 0, suffix: 0},
								};
							vGroups[len].counts[key].total += 1;
							vGroups[len].counts[key].positions[posType] += 1;
							vGroups[len].total += 1;
						}
					} else {
						const seenKey = `${key}|${posType}`;
						if (!seenC.has(seenKey)) {
							seenC.add(seenKey);
							if (!cGroups[len]) cGroups[len] = {total: 0, counts: {}};
							if (!cGroups[len].counts[key])
								cGroups[len].counts[key] = {
									total: 0,
									positions: {prefix: 0, infix: 0, suffix: 0},
								};
							cGroups[len].counts[key].total += 1;
							cGroups[len].counts[key].positions[posType] += 1;
							cGroups[len].total += 1;
						}
					}
				}
				run = '';
				runType = null;
				runStart = -1;
			};

			chars.forEach((ch, idx) => {
				const k = String(ch);
				const t = k.trim();
				if (t === '') {
					flushRun();
					return;
				}
				const lower = t.toLowerCase();
				const isLetter = isLetterRe.test(lower);
				const isVowel = isLetter && vowelSet.has(lower);
				const thisType = isVowel ? 'v' : isLetter ? 'c' : 'c';
				if (runType === null) {
					runType = thisType;
					run = t;
					runStart = idx;
				} else if (runType === thisType) {
					run += t;
				} else {
					flushRun();
					runType = thisType;
					run = t;
					runStart = idx;
				}
			});
			flushRun();
		});

		const makeArr = (groups) => {
			return Object.keys(groups)
				.map((k) => {
					const len = Number(k);
					const total = groups[k].total;
					const rawCounts = groups[k].counts; // pattern -> { total, positions }
					const counts = {}; // pattern -> total
					const probabilities = {}; // pattern -> total/total
					const positions = {}; // pattern -> positions object
					Object.keys(rawCounts).forEach((pat) => {
						counts[pat] = rawCounts[pat].total;
						probabilities[pat] = rawCounts[pat].total / total;
						positions[pat] = rawCounts[pat].positions;
					});
					return {
						length: len,
						total,
						counts,
						probabilities,
						positions,
						namesTotal: namesByLen[len] || 0,
					};
				})
				.sort((a, b) => a.length - b.length);
		};

		const vowels = makeArr(vGroups);
		const consonants = makeArr(cGroups);
		return {vowels, consonants};
	}

	/**
	 * Rendert die gefundenen Vokal- und Konsonantenkombinationen in `containerId`.
	 */
	function displayLetterCombinations(result, containerId = 'results') {
		const container = document.getElementById(containerId);
		if (!container) return;

		const header = document.createElement('h3');
		header.textContent = 'Vokal- und Konsonantenkombinationen';
		container.appendChild(header);

		if (!result || (!Array.isArray(result.vowels) && !Array.isArray(result.consonants))) {
			const p = document.createElement('p');
			p.textContent = 'Keine Daten.';
			container.appendChild(p);
			return;
		}

		// Table rendering will be done after we build the structured JSON below.

		// Kopierbares JSON: position -> (vowels|consonants) -> length -> pattern -> { probability }
		const positionsList = ['prefix', 'infix', 'suffix'];

		// collect all lengths present
		const lengthSet = new Set();
		(result.vowels || []).forEach((it) => lengthSet.add(Number(it.length)));
		(result.consonants || []).forEach((it) => lengthSet.add(Number(it.length)));
		const lengthsSorted = Array.from(lengthSet).sort((a, b) => a - b);

		// temp store for patterns per position/type/length
		const temp = {
			prefix: {vowels: {}, consonants: {}},
			infix: {vowels: {}, consonants: {}},
			suffix: {vowels: {}, consonants: {}},
		};

		// Option A: probabilities relative to all occurrences of that position+type across lengths
		const totals = {
			prefix: {vowels: 0, consonants: 0},
			infix: {vowels: 0, consonants: 0},
			suffix: {vowels: 0, consonants: 0},
		};
		(result.vowels || []).forEach((it) => {
			Object.keys(it.counts || {}).forEach((pat) => {
				const pos =
					it.positions && it.positions[pat]
						? it.positions[pat]
						: {prefix: 0, infix: 0, suffix: 0};
				positionsList.forEach((pName) => {
					const cnt = pos[pName] || 0;
					if (cnt > 0) totals[pName].vowels += cnt;
				});
			});
		});

		(result.vowels || []).forEach((it) => {
			const len = Number(it.length);
			Object.keys(it.counts || {}).forEach((pat) => {
				const pos =
					it.positions && it.positions[pat]
						? it.positions[pat]
						: {prefix: 0, infix: 0, suffix: 0};
				positionsList.forEach((pName) => {
					const cnt = pos[pName] || 0;
					if (cnt > 0 && totals[pName].vowels > 0) {
						const totalOverall = totals[pName].vowels;
						// total of runs of this length for this position+type (sum of positions across all patterns)
						const totalForLengthPos = Object.keys(it.counts || {}).reduce((acc, k) => {
							const ppos =
								it.positions && it.positions[k]
									? it.positions[k]
									: {prefix: 0, infix: 0, suffix: 0};
							return acc + (ppos[pName] || 0);
						}, 0);
						const probOverall = Number(((cnt / totalOverall) * 100).toFixed(2));
						const probByLength =
							totalForLengthPos > 0
								? Number(((cnt / totalForLengthPos) * 100).toFixed(2))
								: 0;

						temp[pName].vowels[String(len)] = temp[pName].vowels[String(len)] || [];
						temp[pName].vowels[String(len)].push({
							pattern: pat,
							count: cnt,
							probOverall,
							probByLength,
							totalOverall,
							totalForLength: totalForLengthPos,
						});
					}
				});
			});
		});

		(result.consonants || []).forEach((it) => {
			Object.keys(it.counts || {}).forEach((pat) => {
				const pos =
					it.positions && it.positions[pat]
						? it.positions[pat]
						: {prefix: 0, infix: 0, suffix: 0};
				positionsList.forEach((pName) => {
					const cnt = pos[pName] || 0;
					if (cnt > 0) totals[pName].consonants += cnt;
				});
			});
		});

		(result.consonants || []).forEach((it) => {
			const len = Number(it.length);
			Object.keys(it.counts || {}).forEach((pat) => {
				const pos =
					it.positions && it.positions[pat]
						? it.positions[pat]
						: {prefix: 0, infix: 0, suffix: 0};
				positionsList.forEach((pName) => {
					const cnt = pos[pName] || 0;
					if (cnt > 0 && totals[pName].consonants > 0) {
						const totalOverall = totals[pName].consonants;
						const totalForLengthPos = Object.keys(it.counts || {}).reduce((acc, k) => {
							const ppos =
								it.positions && it.positions[k]
									? it.positions[k]
									: {prefix: 0, infix: 0, suffix: 0};
							return acc + (ppos[pName] || 0);
						}, 0);
						const probOverall = Number(((cnt / totalOverall) * 100).toFixed(2));
						const probByLength =
							totalForLengthPos > 0
								? Number(((cnt / totalForLengthPos) * 100).toFixed(2))
								: 0;

						temp[pName].consonants[String(len)] =
							temp[pName].consonants[String(len)] || [];
						temp[pName].consonants[String(len)].push({
							pattern: pat,
							count: cnt,
							probOverall,
							probByLength,
							totalOverall,
							totalForLength: totalForLengthPos,
						});
					}
				});
			});
		});

		// final output: include only lengths that have entries and sort patterns by probability desc
		const out = {
			prefix: {vowels: {}, consonants: {}},
			infix: {vowels: {}, consonants: {}},
			suffix: {vowels: {}, consonants: {}},
		};
		positionsList.forEach((pName) => {
			['vowels', 'consonants'].forEach((type) => {
				lengthsSorted.forEach((len) => {
					const arr = (temp[pName][type] && temp[pName][type][String(len)]) || [];
					if (!arr || arr.length === 0) return;
					arr.sort((a, b) => (b.probOverall || 0) - (a.probOverall || 0));
					out[pName][type][String(len)] = Object.fromEntries(
						arr.map((it) => [
							it.pattern,
							{
								count: it.count,
								probOverall: it.probOverall,
								probByLength: it.probByLength,
								totalOverall: it.totalOverall,
								totalForLength: it.totalForLength,
								namesTotal: it.namesTotal,
							},
						])
					);
				});
			});
		});

		// Render tables in order: Position -> Type -> Length -> Patterns
		const posTitles = {prefix: 'Präfixe', infix: 'Infixe', suffix: 'Suffixe'};
		const typeTitles = {vowels: 'Vokale', consonants: 'Konsonanten'};
		positionsList.forEach((pName) => {
			const h4 = document.createElement('h4');
			h4.textContent = posTitles[pName] || pName;
			container.appendChild(h4);
			['vowels', 'consonants'].forEach((type) => {
				const typeObj = out[pName][type] || {};
				const header = document.createElement('h5');
				header.textContent = typeTitles[type] || type;
				container.appendChild(header);
				// build flat list of { length, pattern, probability }
				const rows = [];
				Object.keys(typeObj || {}).forEach((len) => {
					const patternsObj = typeObj[len] || {};
					Object.keys(patternsObj).forEach((pat) => {
						const p = patternsObj[pat];
						rows.push({
							length: Number(len),
							pattern: pat,
							probability: Number(p.probOverall || p.probability || 0),
							count: Number(p.count || 0),
							probs: {
								overall: Number(p.probOverall || 0),
								byLength: Number(p.probByLength || 0),
							},
							denomOverall: Number(p.totalOverall || 0),
							denomLength: Number(p.totalForLength || 0),
						});
					});
				});
				if (rows.length === 0) {
					const p = document.createElement('p');
					p.textContent = 'Keine Kombinationen gefunden.';
					container.appendChild(p);
					return;
				}
				// sort by length asc, then probability desc
				rows.sort((a, b) => a.length - b.length || b.probability - a.probability);

				// display denominators above the table
				// const first = rows[0];
				// const denomOverall = first.denomOverall || totals[pName] && (type === 'vowels' ? totals[pName].vowels : totals[pName].consonants) || 0;
				// const denomLength = first.denomLength || 0;
				// const info = document.createElement('div');
				// info.className = 'mb-1 small text-muted';
				// info.textContent = `${typeTitles[type]} gesamt: ${denomOverall} — ${typeTitles[type]} Länge ${first.length}: ${denomLength}`;
				// container.appendChild(info);

				const table = document.createElement('table');
				table.className = 'table table-sm table-bordered';
				const thead = document.createElement('thead');
				thead.innerHTML =
					'<tr><th>Kombination</th><th>Länge</th><th>Gesamt in Prozent</th><th>Pro Länge in Prozent</th><th>Anzahl</th></tr>';
				table.appendChild(thead);
				const tbody = document.createElement('tbody');
				const fmt = (n) => {
					const s = Number(n || 0)
						.toFixed(2)
						.replace('.', ',');
					return s;
				};
				rows.forEach((r) => {
					const tr = document.createElement('tr');
					const tdK = document.createElement('td');
					tdK.textContent = r.pattern;
					const tdL = document.createElement('td');
					tdL.textContent = String(r.length);
					const tdOverall = document.createElement('td');
					tdOverall.textContent = fmt(r.probs.overall);
					const tdLen = document.createElement('td');
					tdLen.textContent = fmt(r.probs.byLength);
					const tdC = document.createElement('td');
					tdC.textContent = String(r.count);
					tr.appendChild(tdK);
					tr.appendChild(tdL);
					tr.appendChild(tdOverall);
					tr.appendChild(tdLen);
					tr.appendChild(tdC);
					tbody.appendChild(tr);
				});
				table.appendChild(tbody);
				container.appendChild(table);
			});
		});

		// No JSON preview or copy button — tables only
	}

	if (typeof window !== 'undefined') {
		window.calculateLetterCombinations = calculateLetterCombinations;
		window.displayLetterCombinations = displayLetterCombinations;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports.calculateLetterCombinations = calculateLetterCombinations;
		module.exports.displayLetterCombinations = displayLetterCombinations;
	}
})();
