(function () {
	/**
	 * Konvertiert eine HTML-Tabelle zu tabulatorsepariertem Text
	 */
	function tableToText(table) {
		const rows = [];
		const headerCells = table.querySelectorAll('thead th');
		const headers = Array.from(headerCells).map(h => h.textContent.trim());
		rows.push(headers.join('\t'));

		const bodyCells = table.querySelectorAll('tbody tr');
		bodyCells.forEach(row => {
			const cells = row.querySelectorAll('td');
			const values = Array.from(cells).map(c => c.textContent.trim());
			rows.push(values.join('\t'));
		});

		return rows.join('\n');
	}

	/**
	 * Berechnet das CV-Muster eines Morphems
	 * @param {string} morpheme - Das Morphem
	 * @param {Set} vowelSet - Set von Vokalen
	 * @returns {string} - CV-Muster (z.B. "CVCV")
	 */
	function getCVPattern(morpheme, vowelSet) {
		let pattern = '';
		for (const ch of morpheme.toLowerCase()) {
			if (vowelSet.has(ch)) {
				pattern += 'V';
			} else if (/[a-zäöüß]/i.test(ch)) {
				pattern += 'C';
			}
		}
		return pattern;
	}

	/**
	 * Extrahiert alle Vokal- und Konsonantkombinationen aus den Kombinationsdaten.
	 * @param {Object} letterCombinations - Ergebnis von calculateLetterCombinations()
	 * @returns {Object} - {vowels: [], consonants: []}
	 */
	function extractPatterns(letterCombinations) {
		const vowels = [];
		const consonants = [];

		if (letterCombinations.vowels && Array.isArray(letterCombinations.vowels)) {
			letterCombinations.vowels.forEach(item => {
				Object.keys(item.counts || {}).forEach(pattern => {
					vowels.push(pattern);
				});
			});
		}

		if (letterCombinations.consonants && Array.isArray(letterCombinations.consonants)) {
			letterCombinations.consonants.forEach(item => {
				Object.keys(item.counts || {}).forEach(pattern => {
					consonants.push(pattern);
				});
			});
		}

		return { vowels, consonants };
	}

	/**
	 * Erstellt Morpheme durch spezifische Kombinationsmuster von Vokal- und Konsonantkombinationen.
	 * OPTIMIERT: Durchsucht Namen nach gültigen Substrings statt alle Morpheme zu generieren.
	 * Mit Syllable-Splitting (optional) und Overlap-Vermeidung.
	 * Muster:
	 * - VKCK: Vokalkombination + Konsonantkombination
	 * - VKCKVK: Vokalkombination + Konsonantkombination + Vokalkombination
	 * - CKVK: Konsonantkombination + Vokalkombination
	 * - CKVKCK: Konsonantkombination + Vokalkombination + Konsonantkombination
	 *
	 * @param {Array} nameArray - Array von Namen
	 * @param {Object} letterCombinations - Ergebnis von calculateLetterCombinations()
	 * @param {Object} options - {useSyllableSplitting: false}
	 * @returns {Object} - Morpheme organisiert nach Position {prefix, infix, suffix}
	 */
	function createMorphemesFromPatterns(nameArray, letterCombinations, options = {}) {
		const { useSyllableSplitting = false } = options;

		if (!Array.isArray(nameArray) || !letterCombinations) {
			return { prefix: {}, infix: {}, suffix: {} };
		}

		const vowelSet = 
			typeof window !== 'undefined' && typeof window.getVowelSet === 'function'
				? window.getVowelSet()
				: new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);

		const normalizedNames = nameArray
			.map(n => (typeof n === 'string' ? n.trim().toLowerCase() : ''))
			.filter(Boolean);

		// Extrahiere alle Vokal- und Konsonantkombinationen
		const patterns = extractPatterns(letterCombinations);
		const { vowels, consonants } = patterns;

		const combinedMorphemes = new Map(); // morpheme -> { count, positions: {prefix, infix, suffix} }

		/**
		 * Greedy-Matching: Findet Morpheme ohne Überlappungen
		 * Verarbeitet Namen von links nach rechts und nimmt immer das längste Muster
		 */
		const extractMorphemesGreedy = (name) => {
			const found = [];
			let i = 0;

			while (i < name.length) {
				let matched = false;
				let longestMatch = null;
				let longestLength = 0;

				// Priorität: 1. CKVKCK (höchste), 2. CKVK, 3. VKCK

				// Muster 1 (Priorität 1): CKVKCK - Mit Overlap-Vermeidung
				for (const ck1 of consonants) {
					if (name.startsWith(ck1, i)) {
						for (const vk of vowels) {
							if (name.startsWith(vk, i + ck1.length)) {
								for (const ck2 of consonants) {
									if (name.startsWith(ck2, i + ck1.length + vk.length)) {
										// Überprüfe, ob ck2 nicht zu einem nächsten Morphem gehören könnte
										let isValid = true;
										if (useSyllableSplitting) {
											// Überprüfe, ob nach ck2 ein Vokal kommt (würde dann zu nächstem Morphem gehören)
											let nextVowelFound = false;
											for (const vk_next of vowels) {
												if (name.startsWith(vk_next, i + ck1.length + vk.length + ck2.length)) {
													nextVowelFound = true;
													break;
												}
											}
											// Wenn Vokal folgt: Möglicherweise gehört ck2 zum nächsten Morphem
											// Aber nur wenn noch mehr Konsonanten folgen (CKVKC-pattern)
											if (nextVowelFound) {
												let additionalConsonantFound = false;
												for (const ck_next of consonants) {
													if (name.startsWith(ck_next, i + ck1.length + vk.length + ck2.length + 
														(vowels.find(v => name.startsWith(v, i + ck1.length + vk.length + ck2.length)) || { length: 0 }).length)) {
														additionalConsonantFound = true;
														break;
													}
												}
												// Wenn ein weiterer Konsonant folgt, ck2 möglicherweise zu nächstem Morphem
												isValid = !additionalConsonantFound;
											}
										}

										if (isValid) {
											const morpheme = ck1 + vk + ck2;
											if (morpheme.length > longestLength) {
												longestMatch = { morpheme, endIdx: i + morpheme.length };
												longestLength = morpheme.length;
											}
										}
									}
								}
							}
						}
					}
				}

				// Muster 2 (Priorität 2): CKVK (nur wenn noch kein Muster gefunden)
				if (!longestMatch || longestLength < 4) { // CKVKCK hat min. 4 Zeichen
					for (const ck of consonants) {
						if (name.startsWith(ck, i)) {
							for (const vk of vowels) {
								if (name.startsWith(vk, i + ck.length)) {
									const morpheme = ck + vk;
									if (morpheme.length > longestLength) {
										longestMatch = { morpheme, endIdx: i + morpheme.length };
										longestLength = morpheme.length;
									}
								}
							}
						}
					}
				}

				// Muster 3 (Priorität 3): VKCK (nur wenn noch kein Muster gefunden)
				if (!longestMatch || longestLength < 2) {
					for (const vk of vowels) {
						if (name.startsWith(vk, i)) {
							for (const ck of consonants) {
								if (name.startsWith(ck, i + vk.length)) {
									const morpheme = vk + ck;
									if (morpheme.length > longestLength) {
										longestMatch = { morpheme, endIdx: i + morpheme.length };
										longestLength = morpheme.length;
									}
								}
							}
						}
					}
				}

				if (longestMatch) {
					found.push({
						morpheme: longestMatch.morpheme,
						startIdx: i,
						endIdx: longestMatch.endIdx
					});
					i = longestMatch.endIdx;
					matched = true;
				}

				if (!matched) {
					i++;
				}
			}

			return found;
		};

		// Zähle Vorkommen durch Iteration über Namen
		normalizedNames.forEach(name => {
			const morphemesInName = extractMorphemesGreedy(name);

			morphemesInName.forEach(({ morpheme, startIdx, endIdx }) => {
				if (!combinedMorphemes.has(morpheme)) {
					combinedMorphemes.set(morpheme, { count: 0, positions: { prefix: 0, infix: 0, suffix: 0 } });
				}

				const data = combinedMorphemes.get(morpheme);
				data.count++;

				// Klassifiziere Position
				if (startIdx === 0 && endIdx < name.length) {
					data.positions.prefix++;
				} else if (endIdx === name.length && startIdx > 0) {
					data.positions.suffix++;
				} else if (startIdx > 0 && endIdx < name.length) {
					data.positions.infix++;
				}
			});
		});

		// Zielstruktur vorbereiten
		const out = {
			prefix: {},
			infix: {},
			suffix: {}
		};

		// Totals pro Position und Länge
		const totals = {
			prefix: {},
			infix: {},
			suffix: {}
		};

		// Aggregation
		combinedMorphemes.forEach((data, morpheme) => {
			if (data.count === 0) return;

			const len = String(morpheme.length);
			const cvPattern = getCVPattern(morpheme, vowelSet);

			['prefix', 'infix', 'suffix'].forEach(pos => {
				const count = data.positions[pos];
				if (count === 0) return;

				out[pos][len] = out[pos][len] || {};
				out[pos][len][morpheme] = { 
					count,
					pattern: cvPattern
				};

				totals[pos][len] = (totals[pos][len] || 0) + count;
				totals[pos]._overall = (totals[pos]._overall || 0) + count;
			});
		});

		// Wahrscheinlichkeiten berechnen + Sortierung (mit Silbenbildungsgesetzen)
		['prefix', 'infix', 'suffix'].forEach(pos => {
			Object.keys(out[pos])
				.sort((a, b) => Number(a) - Number(b))
				.forEach(len => {
					const entries = Object.entries(out[pos][len]);

					entries
						.sort((a, b) => {
							// Erst nach SSP-Validierung (falls verfügbar)
							if (typeof window.scoreMorpheme === 'function' && typeof window.getSonorityHierarchy === 'function') {
								const hierarchy = window.getSonorityHierarchy();
								const affricates = typeof window.getAffricates === 'function' ? window.getAffricates() : new Set();
								const forbiddenClusters = typeof window.getForbiddenClusters === 'function' ? window.getForbiddenClusters() : new Set();
								
								// Bewerte nach Sonority Sequencing Principle
								const scoreA = window.scoreMorpheme(a[0], vowelSet, 
									typeof window.getSonorants === 'function' ? window.getSonorants() : new Set(),
									typeof window.getObstruents === 'function' ? window.getObstruents() : new Set());
								const scoreB = window.scoreMorpheme(b[0], vowelSet,
									typeof window.getSonorants === 'function' ? window.getSonorants() : new Set(),
									typeof window.getObstruents === 'function' ? window.getObstruents() : new Set());
								
								if (Math.abs(scoreB - scoreA) > 0.01) {
									return scoreB - scoreA; // Höherer Score zuerst
								}
							}
							// Dann nach Häufigkeit
							if (b[1].count !== a[1].count) {
								return b[1].count - a[1].count;
							}
							// Dann alphabetisch
							return a[0].localeCompare(b[0]);
						})
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

	/**
	 * Erstellt JSON-Struktur aus Morphemen für Anzeige und Kopieren
	 * @param {Object} morphemesResult - Ergebnis von createMorphemesFromPatterns()
	 * @returns {Object} - JSON-freundliche Struktur
	 */
	function createMorphemesJSON(morphemesResult) {
		if (!morphemesResult) {
			return { prefix: {}, infix: {}, suffix: {} };
		}

		const result = {
			prefix: {},
			infix: {},
			suffix: {}
		};

		['prefix', 'infix', 'suffix'].forEach(position => {
			const posData = morphemesResult[position];
			
			Object.keys(posData)
				.sort((a, b) => Number(a) - Number(b))
				.forEach(len => {
					const lengthStr = String(len);
					result[position][lengthStr] = {};

					Object.entries(posData[len]).forEach(([morpheme, data]) => {
						result[position][lengthStr][morpheme] = {
							pattern: data.pattern,
							count: data.count,
							probOverall: data.probOverall,
							probByLength: data.probByLength
						};
					});
				});
		});

		return result;
	}

	/**
	 * Konvertiert eine Tabelle zu tabulatorsepariertem Text für Clipboard
	 */
	function tableToText(table) {
		const rows = [];
		const headerCells = table.querySelectorAll('thead th');
		const headers = Array.from(headerCells).map(h => h.textContent.trim());
		rows.push(headers.join('\t'));

		const bodyCells = table.querySelectorAll('tbody tr');
		bodyCells.forEach(row => {
			const cells = row.querySelectorAll('td');
			const values = Array.from(cells).map(c => c.textContent.trim());
			rows.push(values.join('\t'));
		});

		return rows.join('\n');
	}

	/**
	 * Zeigt Morpheme in einer Tabelle an (eine Tabelle pro Position mit allen Längen)
	 * @param {Object} morphemesResult - Ergebnis von createMorphemesFromPatterns()
	 * @param {string} containerId - ID des HTML-Containers
	 */
	function displayMorphemesFromPatterns(morphemesResult, containerId = 'results') {
		const container = document.getElementById(containerId);
		if (!container || !morphemesResult) return;

		const categoryNames = {
			prefix: 'Präfix',
			infix: 'Infix',
			suffix: 'Suffix'
		};

		['prefix', 'infix', 'suffix'].forEach(pos => {
			const posData = morphemesResult[pos];
			if (!posData || Object.keys(posData).length === 0) return;

			const h4 = document.createElement('h4');
			h4.textContent = categoryNames[pos] || pos;
			h4.style.marginTop = '20px';
			container.appendChild(h4);

			// Sammle alle Morpheme aus allen Längen
			const allMorphemes = [];
			Object.keys(posData)
				.sort((a, b) => Number(a) - Number(b))
				.forEach(len => {
					const morphemesOfLen = posData[len];
					if (!morphemesOfLen) return;

					Object.entries(morphemesOfLen).forEach(([morpheme, data]) => {
						allMorphemes.push({
							morpheme,
							length: len,
							...data
						});
					});
				});

			if (allMorphemes.length === 0) return;

			// Sortiere nach Länge, dann nach Häufigkeit
			allMorphemes.sort((a, b) => {
				if (Number(a.length) !== Number(b.length)) {
					return Number(a.length) - Number(b.length);
				}
				return b.count - a.count;
			});

			const table = document.createElement('table');
			table.className = 'table table-sm table-bordered';

			const thead = document.createElement('thead');
			thead.innerHTML = `
				<tr>
					<th>Morphem</th>
					<th>Länge</th>
					<th>CV-Muster</th>
					<th>Gesamt in Prozent</th>
					<th>Pro Länge in Prozent</th>
					<th>Anzahl</th>
				</tr>
			`;
			table.appendChild(thead);

			const tbody = document.createElement('tbody');

			allMorphemes.forEach((item) => {
				const tr = document.createElement('tr');

				const tdM = document.createElement('td');
				tdM.textContent = item.morpheme;

				const tdLen = document.createElement('td');
				tdLen.textContent = item.length;

				const tdPattern = document.createElement('td');
				tdPattern.textContent = item.pattern || '';

				const tdPO = document.createElement('td');
				tdPO.textContent = item.probOverall.toFixed(2).replace('.', ',');

				const tdPL = document.createElement('td');
				tdPL.textContent = item.probByLength.toFixed(2).replace('.', ',');

				const tdCount = document.createElement('td');
				tdCount.textContent = item.count;

				tr.appendChild(tdM);
				tr.appendChild(tdLen);
				tr.appendChild(tdPattern);
				tr.appendChild(tdPO);
				tr.appendChild(tdPL);
				tr.appendChild(tdCount);

				tbody.appendChild(tr);
			});

			table.appendChild(tbody);

			// Add copy button if available
			if (typeof window.createTableCopyButton === 'function') {
				const copyBtn = window.createTableCopyButton(table, `${categoryNames[pos]} kopieren`);
				container.appendChild(copyBtn);
			}

			container.appendChild(table);
		});
	}

	if (typeof window !== 'undefined') {
		window.createMorphemesFromPatterns = createMorphemesFromPatterns;
		window.createMorphemesJSON = createMorphemesJSON;
		window.displayMorphemesFromPatterns = displayMorphemesFromPatterns;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			createMorphemesFromPatterns,
			createMorphemesJSON,
			displayMorphemesFromPatterns
		};
	}
})();
