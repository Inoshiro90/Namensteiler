// Returns a Set of vowels based on the comma/space-separated input value
window.getVowelSet = function () {
	try {
		const el = document.getElementById('vowelInput');
		if (!el) return new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
		const raw = String(el.value || '');
		if (!raw) return new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
		const parts = raw
			.split(/[,\s]+/)
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean);
		return new Set(parts);
	} catch (e) {
		return new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
	}
};
// Automatic re-run on vowel input removed; analysis runs only on button click
// Eventlistener: beim Absenden des Formulars die Namen lesen
const form = document.getElementById('nameForm');
if (form) {
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		const textarea = document.getElementById('namesInput');
		const nameArray = readNames(textarea);
		const positions = breakDownNames(nameArray);

		const results = document.getElementById('results');
		if (!results) return;
		// clear once, we'll orchestrate sections
		results.innerHTML = '';

		// helper: create collapsible section and return inner container id
		const createSection = (title, id, open = false) => {
			const wrapper = document.createElement('div');
			wrapper.className = 'section mb-3';

			const hdr = document.createElement('div');
			hdr.className = 'd-flex align-items-center';
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'btn btn-link p-0';
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
			btn.textContent = open ? '▾ ' + title : '▸ ' + title;
			hdr.appendChild(btn);

			const inner = document.createElement('div');
			inner.id = id;
			inner.style.display = open ? 'block' : 'none';
			inner.className = 'mt-2';

			btn.addEventListener('click', () => {
				const isOpen = inner.style.display !== 'none';
				inner.style.display = isOpen ? 'none' : 'block';
				btn.textContent = isOpen ? '▸ ' + title : '▾ ' + title;
				btn.setAttribute('aria-expanded', (!isOpen).toString());
			});

			wrapper.appendChild(hdr);
			wrapper.appendChild(inner);
			results.appendChild(wrapper);
			return id;
		};

		// 1) JSON: Vereinigtes Objekt pro Namenslänge
		// const mergedId = 'sec-merged';
		// createSection('Vereinigtes Objekt pro Namenslänge (JSON)', mergedId, true);
		// reuse displayPositions merged logic by asking it to render only merged
		// if (typeof displayPositions === 'function')
		//     displayPositions(positions, mergedId, nameArray, {
		//         renderArrays: false,
		//         renderObjectArray: false,
		//         renderMerged: true,
		//     });

		// 2) JSON: Konsonanten- und Vokalkombinationen

		// Create separate JSON sections: Namenslängen and C/V-Muster (Kombinationen JSON is above)
		const lengthsJsonId = 'sec-lengths-json';
		createSection('Namenslängen (JSON)', lengthsJsonId, false);
		const lengthsNode = document.getElementById(lengthsJsonId);
		if (lengthsNode) {
			const lengthsArr =
				typeof calculateLengthDistribution === 'function'
					? calculateLengthDistribution(nameArray)
					: [];
			const lengthsObj = {};
			(lengthsArr || []).forEach((it) => {
				lengthsObj[String(it.length)] = {
					count: it.count,
					probability: Number((it.probability * 100).toFixed(2)),
				};
			});
			const jLen = JSON.stringify(lengthsObj, null, 2);
			const copyLen = document.createElement('button');
			copyLen.type = 'button';
			copyLen.className = 'btn btn-sm btn-secondary mb-2';
			copyLen.textContent = 'Namenslängen (JSON) kopieren';
			copyLen.addEventListener('click', async () => {
				try {
					if (navigator.clipboard) await navigator.clipboard.writeText(jLen);
				} catch (e) {}
			});
			lengthsNode.appendChild(copyLen);
			const preLen = document.createElement('pre');
			preLen.textContent = jLen;
			lengthsNode.appendChild(preLen);
		}

		const cvJsonId = 'sec-cv-json';
		createSection('C/V-Muster (JSON)', cvJsonId, false);
		const cvNode = document.getElementById(cvJsonId);
		if (cvNode) {
			const cvArr =
				typeof calculateCVPatternsPerLength === 'function'
					? calculateCVPatternsPerLength(nameArray)
					: [];
			const cvObj = {};
			(cvArr || []).forEach((it) => {
				cvObj[String(it.length)] = Object.fromEntries(
					Object.keys(it.probabilities || {}).map((p) => [
						p,
						Number((it.probabilities[p] * 100).toFixed(2)),
					])
				);
			});
			const jCv = JSON.stringify(cvObj, null, 2);
			const copyCv = document.createElement('button');
			copyCv.type = 'button';
			copyCv.className = 'btn btn-sm btn-secondary mb-2';
			copyCv.textContent = 'C/V-Muster (JSON) kopieren';
			copyCv.addEventListener('click', async () => {
				try {
					if (navigator.clipboard) await navigator.clipboard.writeText(jCv);
				} catch (e) {}
			});
			cvNode.appendChild(copyCv);
			const preCv = document.createElement('pre');
			preCv.textContent = jCv;
			cvNode.appendChild(preCv);
		}

		const combosJsonId = 'sec-combos-json';
		createSection('Vokal- und Konsonantenkombinationen (JSON)', combosJsonId, false);
		if (typeof calculateLetterCombinations === 'function') {
			const combos = calculateLetterCombinations(nameArray);
			// Build nested JSON: position -> (vowels|consonants) -> length -> pattern -> { probability }
			const positionsList = ['prefix', 'infix', 'suffix'];

			const lengthSet = new Set();
			(combos.vowels || []).forEach((it) => lengthSet.add(Number(it.length)));
			(combos.consonants || []).forEach((it) => lengthSet.add(Number(it.length)));
			const lengthsSorted = Array.from(lengthSet).sort((a, b) => a - b);

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
			(combos.vowels || []).forEach((it) => {
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
			(combos.consonants || []).forEach((it) => {
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

			(combos.vowels || []).forEach((it) => {
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
							// total runs of this length for this position+type
							const totalForLengthPos = Object.keys(it.counts || {}).reduce(
								(acc, k) => {
									const ppos =
										it.positions && it.positions[k]
											? it.positions[k]
											: {prefix: 0, infix: 0, suffix: 0};
									return acc + (ppos[pName] || 0);
								},
								0
							);
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

			(combos.consonants || []).forEach((it) => {
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
							const totalForLengthPos = Object.keys(it.counts || {}).reduce(
								(acc, k) => {
									const ppos =
										it.positions && it.positions[k]
											? it.positions[k]
											: {prefix: 0, infix: 0, suffix: 0};
									return acc + (ppos[pName] || 0);
								},
								0
							);
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
								},
							])
						);
					});
				});
			});
			const node = document.getElementById(combosJsonId);
			if (node) {
				const copyBtn = document.createElement('button');
				copyBtn.type = 'button';
				copyBtn.className = 'btn btn-sm btn-secondary  mb-2';
				copyBtn.textContent = 'Kombinationen (JSON) kopieren';
				const j = JSON.stringify(out, null, 2);
				copyBtn.addEventListener('click', async () => {
					try {
						if (navigator.clipboard) await navigator.clipboard.writeText(j);
					} catch (e) {}
				});
				node.appendChild(copyBtn);
				const pre = document.createElement('pre');
				pre.textContent = j;
				node.appendChild(pre);
			}
		}

		// 2b) JSON: Morpheme (Longest Common Substrings über alle Namen)
		const morphemesJsonId = 'sec-morphemes-json';
		createSection('Morpheme (JSON)', morphemesJsonId, false);

		const morphemesNode = document.getElementById(morphemesJsonId);
		if (morphemesNode && typeof extractMorphemes === 'function') {
			const morphemesResult = extractMorphemes(nameArray, {
				minLength: 2,
				minOccurrences: 2,
			});

			const morphemesJson = JSON.stringify(morphemesResult, null, 2);

			const copyBtn = document.createElement('button');
			copyBtn.type = 'button';
			copyBtn.className = 'btn btn-sm btn-secondary mb-2';
			copyBtn.textContent = 'Morpheme (JSON) kopieren';
			copyBtn.addEventListener('click', async () => {
				try {
					if (navigator.clipboard) {
						await navigator.clipboard.writeText(morphemesJson);
					}
				} catch (e) {}
			});

			morphemesNode.appendChild(copyBtn);

			const pre = document.createElement('pre');
			pre.textContent = morphemesJson;
			morphemesNode.appendChild(pre);
		}

		// 3) Arrays: Buchstaben pro Position
		const arraysId = 'sec-arrays';
		createSection('Buchstaben pro Position (Arrays)', arraysId, false);
		if (typeof displayPositions === 'function')
			displayPositions(positions, arraysId, nameArray, {
				renderArrays: true,
				renderObjectArray: false,
				renderMerged: false,
			});

		// 4) Tabelle: Wahrscheinlichkeiten Namenslänge
		const lenId = 'sec-lengths';
		createSection('Wahrscheinlichkeiten Namenslänge (Tabelle)', lenId, false);
		if (
			typeof calculateLengthDistribution === 'function' &&
			typeof displayLengthDistribution === 'function'
		) {
			const dist = calculateLengthDistribution(nameArray);
			displayLengthDistribution(dist, lenId);
		}

		// // 6) Tabelle: Wahrscheinlichkeiten Buchstaben pro Position pro Namenslänge
		// const lettersPerLenId = 'sec-letters-per-len';
		// createSection('Wahrscheinlichkeiten Buchstaben pro Position pro Namenslänge', lettersPerLenId, false);
		// if (typeof calculateLengthDistribution === 'function') {
		// 	const lengthDist = calculateLengthDistribution(nameArray);
		// 	const node = document.getElementById(lettersPerLenId);
		// 	lengthDist.forEach(ld => {
		// 		const len = ld.length;
		// 		const namesOfLen = nameArray.filter(n => (typeof n === 'string' ? n.trim().length : 0) === len).map(n => n.trim());
		// 		const h = document.createElement('h5'); h.textContent = `Länge ${len}`; node.appendChild(h);
		// 		const table = document.createElement('table'); table.className='table table-sm table-bordered';
		// 		const thead = document.createElement('thead'); thead.innerHTML='<tr><th>Position</th><th>Buchstabe</th><th>%</th></tr>'; table.appendChild(thead);
		// 		const tbody = document.createElement('tbody');
		// 		for (let pos=0; pos<len; pos++){
		// 			const bucket = namesOfLen.map(n => (n[pos] !== undefined ? n[pos] : ''));
		// 			const total = bucket.length || 1;
		// 			const counts = {};
		// 			bucket.forEach(ch=>{ const t = (typeof ch==='string'?ch:'').trim(); if(t==='') return; const k=t.toLowerCase(); counts[k]=(counts[k]||0)+1; });
		// 			Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).forEach(k=>{
		// 				const tr = document.createElement('tr');
		// 				const tdPos = document.createElement('td'); tdPos.textContent = String(pos+1);
		// 				const tdK = document.createElement('td'); tdK.textContent = k;
		// 				const tdP = document.createElement('td'); tdP.textContent = ((counts[k]/total)*100).toFixed(2);
		// 				tr.appendChild(tdPos); tr.appendChild(tdK); tr.appendChild(tdP); tbody.appendChild(tr);
		// 			});
		// 		}
		// 		table.appendChild(tbody); node.appendChild(table);
		// 	});
		// }

		// 7) Tabelle: Wahrscheinlichkeiten C/V-Kombinationen pro Namenslänge
		const cvPatternsId = 'sec-cv-patterns';
		createSection(
			'Wahrscheinlichkeiten C/V-Muster pro Namenslänge (Tabelle)',
			cvPatternsId,
			false
		);
		if (
			typeof calculateCVPatternsPerLength === 'function' &&
			typeof displayCVPatternsPerLength === 'function'
		) {
			const cv = calculateCVPatternsPerLength(nameArray);
			displayCVPatternsPerLength(cv, cvPatternsId);
		}

		// 8) Tabelle: Vokal- und Konsonantenkombinationen
		const combosId = 'sec-combos-table';
		createSection('Vokal- und Konsonantenkombinationen (Tabelle)', combosId, false);
		if (
			typeof calculateLetterCombinations === 'function' &&
			typeof displayLetterCombinations === 'function'
		) {
			const combos = calculateLetterCombinations(nameArray);
			displayLetterCombinations(combos, combosId);
		}

		// 9) Tabelle: Morpheme
		const morphemesTableId = 'sec-morphemes-table';
		createSection('Morpheme (Tabelle)', morphemesTableId, false);

		if (typeof extractMorphemes === 'function') {
			const morphemes = extractMorphemes(nameArray, {
				minLength: 2,
				minOccurrences: 2,
			});
			displayMorphemesTable(morphemes, morphemesTableId);
		}
	});
} else {
	console.warn('Formular #nameForm nicht gefunden.');
}
