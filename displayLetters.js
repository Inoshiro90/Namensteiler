/*
 * Rendert Positions-Arrays in das Element mit der ID `results`.
 * Erwartetes Format von `positions`: Array von Objekten { position: number, letters: string[] }
 */
(function () {
	function displayPositions(positions, containerId = 'results', nameArray = [], options = {}) {
		const container = document.getElementById(containerId);
		if (!container) {
			console.warn(`Element #${containerId} nicht gefunden.`);
			return;
		}

		container.innerHTML = '';
		if (!Array.isArray(positions) || positions.length === 0) {
			const p = document.createElement('p');
			p.textContent = 'Keine Positionen zum Anzeigen.';
			container.appendChild(p);
			return;
		}

		let probabilitiesByPosition = null;
		if (typeof calculateProbabilities === 'function') {
			try {
				probabilitiesByPosition = calculateProbabilities(positions);
			} catch (e) {
				probabilitiesByPosition = null;
			}
		}

		const opts = Object.assign(
			{renderArrays: true, renderObjectArray: true, renderMerged: false},
			options || {}
		);

		if (opts.renderMerged && Array.isArray(nameArray) && nameArray.length > 0) {
			const lengthDist =
				typeof calculateLengthDistribution === 'function'
					? calculateLengthDistribution(nameArray)
					: [];
			const cvDist =
				typeof calculateCVPatternsPerLength === 'function'
					? calculateCVPatternsPerLength(nameArray)
					: [];

			const merged = {};
			const cvMap = {};
			cvDist.forEach((item) => {
				cvMap[item.length] = Object.fromEntries(
					Object.keys(item.counts || {}).map((pat) => [
						pat,
						Number((item.probabilities[pat] * 100).toFixed(2)),
					])
				);
			});

			lengthDist.forEach((ld) => {
				const len = ld.length;
				const lenProb = Number((ld.probability * 100).toFixed(2));
				const namesOfLen = nameArray
					.filter((n) => (typeof n === 'string' ? n.trim().length : 0) === len)
					.map((n) => n.trim());

				const letters = {};
				for (let pos = 0; pos < len; pos++) {
					const bucket = namesOfLen.map((n) => (n[pos] !== undefined ? n[pos] : ''));
					const total = bucket.length;
					const vowels = {};
					const consonants = {};
					bucket.forEach((ch) => {
						const raw = typeof ch === 'string' ? ch : String(ch);
						const t = raw.trim();
						if (t === '') return;
						const k = t.toLowerCase();
						const isLetter = /^[a-zäöüß]$/i.test(k);
						if (!isLetter) consonants[k] = (consonants[k] || 0) + 1;
						else {
							const vowelSet = (typeof window !== 'undefined' && typeof window.getVowelSet === 'function')
								? window.getVowelSet()
								: new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
							if (vowelSet.has(k)) vowels[k] = (vowels[k] || 0) + 1;
							else consonants[k] = (consonants[k] || 0) + 1;
						}
					});

					const vowelsPerc = {};
					Object.keys(vowels).forEach((k) => {
						vowelsPerc[k] = Number(((vowels[k] / (total || 1)) * 100).toFixed(2));
					});
					const consonantsPerc = {};
					Object.keys(consonants).forEach((k) => {
						consonantsPerc[k] = Number(
							((consonants[k] / (total || 1)) * 100).toFixed(2)
						);
					});
					letters[pos + 1] = {vowels: vowelsPerc, consonants: consonantsPerc};
				}

				merged[len] = {
					length: len,
					lengthProbability: lenProb,
					letters,
					patterns: cvMap[len] || {},
				};
			});

			const sep2 = document.createElement('hr');
			container.appendChild(sep2);
			const h3m = document.createElement('h3');
			h3m.textContent = 'Vereinigtes Objekt pro Namenslänge';
			container.appendChild(h3m);
			const copyMergedBtn = document.createElement('button');
			copyMergedBtn.type = 'button';
			copyMergedBtn.className = 'btn btn-sm btn-secondary  mb-2';
			copyMergedBtn.textContent = 'Vereinigtes Objekt kopieren';
			const mergedJson = JSON.stringify(merged, null, 2);
			copyMergedBtn.addEventListener('click', async () => {
				try {
					if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function')
						await navigator.clipboard.writeText(mergedJson);
					else {
						const ta = document.createElement('textarea');
						ta.value = mergedJson;
						ta.setAttribute('readonly', '');
						ta.style.position = 'absolute';
						ta.style.left = '-9999px';
						document.body.appendChild(ta);
						ta.select();
						document.execCommand('copy');
						document.body.removeChild(ta);
					}
					const old = copyMergedBtn.textContent;
					copyMergedBtn.textContent = 'Kopiert!';
					copyMergedBtn.disabled = true;
					setTimeout(() => {
						copyMergedBtn.textContent = old;
						copyMergedBtn.disabled = false;
					}, 1500);
				} catch (e) {
					console.error('Kopieren fehlgeschlagen', e);
					copyMergedBtn.textContent = 'Fehler';
					setTimeout(() => {
						copyMergedBtn.textContent = 'Vereinigtes Objekt kopieren';
					}, 1500);
				}
			});
			container.appendChild(copyMergedBtn);
			const preMerged = document.createElement('pre');
			preMerged.textContent = mergedJson;
			container.appendChild(preMerged);
		}

		if (opts.renderArrays) {
			positions.forEach((posObj) => {
				const h2 = document.createElement('h2');
				h2.textContent = `Position ${posObj.position}`;
				container.appendChild(h2);
				const p = document.createElement('p');
				if (Array.isArray(posObj.letters) && posObj.letters.length > 0) {
					const sorted = [...posObj.letters].sort((a, b) =>
						String(a).localeCompare(String(b), 'de', {sensitivity: 'base'})
					);
					const quoted = sorted.map((l) => `"${String(l).replace(/"/g, '\\"')}"`);
					p.textContent = `[ ${quoted.join(', ')} ]`;
					var _copyText = JSON.stringify(sorted);
				} else {
					p.textContent = '[]';
					var _copyText = JSON.stringify([]);
				}
				container.appendChild(p);

				const copyBtn = document.createElement('button');
				copyBtn.type = 'button';
				copyBtn.className = 'btn btn-sm btn-outline-primary mb-3';
				copyBtn.textContent = 'In Zwischenablage kopieren';
				copyBtn.setAttribute('aria-label', `Kopiere Position ${posObj.position}`);
				const copyText =
					typeof _copyText !== 'undefined'
						? _copyText
						: JSON.stringify(posObj.letters || []);
				copyBtn.addEventListener('click', async () => {
					try {
						if (
							navigator.clipboard &&
							typeof navigator.clipboard.writeText === 'function'
						)
							await navigator.clipboard.writeText(copyText);
						else {
							const ta = document.createElement('textarea');
							ta.value = copyText;
							ta.setAttribute('readonly', '');
							ta.style.position = 'absolute';
							ta.style.left = '-9999px';
							document.body.appendChild(ta);
							ta.select();
							document.execCommand('copy');
							document.body.removeChild(ta);
						}
						const old = copyBtn.textContent;
						copyBtn.textContent = 'Kopiert!';
						copyBtn.disabled = true;
						setTimeout(() => {
							copyBtn.textContent = old;
							copyBtn.disabled = false;
						}, 1500);
					} catch (e) {
						console.error('Kopieren fehlgeschlagen', e);
						copyBtn.textContent = 'Fehler';
						setTimeout(() => {
							copyBtn.textContent = 'In Zwischenablage kopieren';
						}, 1500);
					}
				});
				container.appendChild(copyBtn);

				const probForPos =
					probabilitiesByPosition &&
					probabilitiesByPosition.find((p) => p.position === posObj.position);
				const probDiv = document.createElement('div');
				probDiv.className = 'position-probabilities mb-3';
				if (probForPos) {
					const keys = Object.keys(probForPos.counts || {});
					keys.sort((a, b) => {
						const ta = String(a).trim();
						const tb = String(b).trim();
						const aEmpty = ta === '';
						const bEmpty = tb === '';
						if (aEmpty && !bEmpty) return 1;
						if (bEmpty && !aEmpty) return -1;
						return ta.localeCompare(tb, 'de', {sensitivity: 'base'});
					});
					keys.forEach((k) => {
						const pLine = document.createElement('div');
						const raw = String(k);
						const label = raw.trim() === '' ? '""' : raw;
						const prob = (probForPos.probabilities[k] || 0) * 100;
						pLine.textContent = `${label}: ${prob.toFixed(2)}%`;
						probDiv.appendChild(pLine);
					});
				}
				container.appendChild(probDiv);
			});
		}

		if (
			opts.renderObjectArray &&
			probabilitiesByPosition &&
			probabilitiesByPosition.length > 0
		) {
			const sep = document.createElement('hr');
			container.appendChild(sep);
			const h3 = document.createElement('h3');
			h3.textContent = 'Wahrscheinlichkeiten (Object)';
			container.appendChild(h3);
			const vcDist =
				typeof calculateVowelConsonantDistribution === 'function'
					? calculateVowelConsonantDistribution(positions)
					: null;
			const out = probabilitiesByPosition.map((p) => {
				const entriesAll = Object.entries(p.probabilities || {});
				entriesAll.sort((a, b) => (b[1] || 0) - (a[1] || 0));
				const probabilitiesAll = Object.fromEntries(
					entriesAll.map(([k, v]) => [k, (v * 100).toFixed(2)])
				);
				let probabilitiesVowels = {};
				let probabilitiesConsonants = {};
				if (vcDist) {
					const vc = vcDist.find((x) => x.position === p.position);
					if (vc) {
						const vEntries = Object.entries(vc.vowelProbsNormalized || {});
						vEntries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
						probabilitiesVowels = Object.fromEntries(
							vEntries.map(([k, v]) => [k, (v * 100).toFixed(2)])
						);
						const cEntries = Object.entries(vc.consonantProbsNormalized || {});
						cEntries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
						probabilitiesConsonants = Object.fromEntries(
							cEntries.map(([k, v]) => [k, (v * 100).toFixed(2)])
						);
					}
				}
				return {
					position: p.position,
					probabilitiesAll,
					probabilitiesVowels,
					probabilitiesConsonants,
				};
			});
			const copyAllBtn = document.createElement('button');
			copyAllBtn.type = 'button';
			copyAllBtn.className = 'btn btn-sm btn-secondary  mb-2';
			copyAllBtn.textContent = 'Object Array kopieren';
			copyAllBtn.setAttribute('aria-label', 'Kopiere Wahrscheinlichkeiten als JSON');
			const outJson = JSON.stringify(out, null, 2);
			copyAllBtn.addEventListener('click', async () => {
				try {
					if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function')
						await navigator.clipboard.writeText(outJson);
					else {
						const ta = document.createElement('textarea');
						ta.value = outJson;
						ta.setAttribute('readonly', '');
						ta.style.position = 'absolute';
						ta.style.left = '-9999px';
						document.body.appendChild(ta);
						ta.select();
						document.execCommand('copy');
						document.body.removeChild(ta);
					}
					const old = copyAllBtn.textContent;
					copyAllBtn.textContent = 'Kopiert!';
					copyAllBtn.disabled = true;
					setTimeout(() => {
						copyAllBtn.textContent = old;
						copyAllBtn.disabled = false;
					}, 1500);
				} catch (e) {
					console.error('Kopieren fehlgeschlagen', e);
					copyAllBtn.textContent = 'Fehler';
					setTimeout(() => {
						copyAllBtn.textContent = 'Object Array kopieren';
					}, 1500);
				}
			});
			container.appendChild(copyAllBtn);
			const pre = document.createElement('pre');
			pre.textContent = outJson;
			container.appendChild(pre);
		}
	}
	if (typeof window !== 'undefined') window.displayPositions = displayPositions;
	if (typeof module !== 'undefined' && module.exports) module.exports = {displayPositions};
})();
