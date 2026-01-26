// (function () {
// 	// Pronunciation rules UI and storage
// 	const STORAGE_KEY = 'pronunciationRules_v1';

// 	const LANGS = [
// 		'Deutsche Aussprache',
// 		'Englische Aussprache',
// 		'Französische Aussprache',
// 		'Spanische Aussprache',
// 		'Italienische Aussprache',
// 		'Benutzerdefinierte Ausspracheregeln',
// 	];

// 	const IPA_OPTIONS = [
// 		'a',
// 		'ɐ',
// 		'ɑ',
// 		'ɒ',
// 		'æ',
// 		'ɑ̃',
// 		'ʌ',
// 		'b',
// 		'ɓ',
// 		'ʙ',
// 		'β',
// 		'c',
// 		'ç',
// 		'ɕ',
// 		'ɔ',
// 		'ɔ̃',
// 		'd',
// 		'ɗ',
// 		'ɖ',
// 		'ð',
// 		'd͡z',
// 		'd͡ʒ',
// 		'd̠͡ʑ',
// 		'ɖ͡ʐ',
// 		'e',
// 		'ə',
// 		'ɘ',
// 		'ɛ',
// 		'ɛ̃',
// 		'ɜ',
// 		'f',
// 		'ɸ',
// 		'ɡ',
// 		'ɠ',
// 		'ɢ',
// 		'ʛ',
// 		'ɣ',
// 		'ɤ',
// 		'h',
// 		'ħ',
// 		'ɦ',
// 		'ɧ',
// 		'ʜ',
// 		'ɥ',
// 		'i',
// 		'ĩ',
// 		'ɨ',
// 		'ɪ',
// 		'ɯ',
// 		'j',
// 		'ʝ',
// 		'ɟ',
// 		'ʄ',
// 		'k',
// 		'k͡x',
// 		'l',
// 		'ɫ',
// 		'ɬ',
// 		'ɭ',
// 		'ʟ',
// 		'ɮ',
// 		'ʎ',
// 		'm',
// 		'ɱ',
// 		'ʍ',
// 		'ɰ',
// 		'n',
// 		'ɲ',
// 		'ŋ',
// 		'ɳ',
// 		'ɴ',
// 		'o',
// 		'õ',
// 		'ɵ',
// 		'ø',
// 		'ɞ',
// 		'œ',
// 		'œ̃',
// 		'ɶ',
// 		'ʊ',
// 		'ʘ',
// 		'p',
// 		'p͡f',
// 		'q',
// 		'r',
// 		'ɾ',
// 		'ɺ',
// 		'ɽ',
// 		'ɹ',
// 		'ɻ',
// 		'ʀ',
// 		'ʁ',
// 		'r̝',
// 		's',
// 		'ʂ',
// 		'ʃ',
// 		's͡f',
// 		't',
// 		'ʈ',
// 		'θ',
// 		't͡s',
// 		't͡ʃ',
// 		't̠͡ɕ',
// 		'ʈ͡ʂ',
// 		'u',
// 		'ũ',
// 		'ʉ',
// 		'v',
// 		'v̊',
// 		'ʋ',
// 		'ѵ',
// 		'w',
// 		'w̃',
// 		'ʍ',
// 		'ɰ',
// 		'ɯ',
// 		'x',
// 		'χ',
// 		'y',
// 		'ʏ',
// 		'z',
// 		'ʑ',
// 		'ʐ',
// 		'ʒ',
// 		'z͡v',
// 	];

// 	const IPA_DESCRIPTIONS = {
// 		a: 'Ungerundeter offener Vorderzungenvokal',
// 		ɐ: 'Fast offener Zentralvokal',
// 		ɑ: 'Ungerundeter offener Hinterzungenvokal',
// 		ɒ: 'Gerundeter offener Hinterzungenvokal',
// 		æ: 'Ungerundeter fast offener Vorderzungenvokal',
// 		ɑ̃: 'Ungerundeter offener Hinterzungennasalvokal',
// 		ʌ: 'Ungerundeter halboffener Hinterzungenvokal',
// 		b: 'Stimmhafter bilabialer Plosiv',
// 		ɓ: 'Stimmhafter bilabialer Implosiv',
// 		ʙ: 'Stimmhafter bilabialer Vibrant',
// 		β: 'Stimmhafter bilabialer Frikativ',
// 		c: 'Stimmloser palataler Plosiv',
// 		ç: 'Stimmloser palataler Frikativ',
// 		ɕ: 'Stimmloser alveolopalataler Frikativ',
// 		ɔ: 'Gerundeter halboffener Hinterzungenvokal',
// 		ɔ̃: 'Gerundeter halboffener Hinterzungennasalvokal',
// 		d: 'Stimmhafter alveolarer Plosiv',
// 		ɗ: 'Stimmhafter dentaler Implosiv',
// 		ɖ: 'Stimmhafter retroflexer Plosiv',
// 		ð: 'Stimmhafter dentaler Frikativ',
// 		d͡z: 'Stimmhafte alveolare Affrikate',
// 		d͡ʒ: 'Stimmhafte postalveolare Affrikate',
// 		d̠͡ʑ: 'Stimmhafte alveolopalatale Affrikate',
// 		ɖ͡ʐ: 'Stimmhafte retroflexe Affrikate',
// 		e: 'Ungerundeter halbgeschlossener Vorderzungenvokal',
// 		ə: 'Mittlerer Zentralvokal',
// 		ɘ: 'Ungerundeter halbgeschlossener Zentralvokal',
// 		ɛ: 'Ungerundeter halboffener Vorderzungenvokal',
// 		ɛ̃: 'Ungerundeter halboffener Vorderzungennasalvokal',
// 		ɜ: 'Ungerundeter halboffener Zentralvokal',
// 		f: 'Stimmloser labiodentaler Frikativ',
// 		ɸ: 'Stimmloser bilabialer Frikativ',
// 		ɡ: 'Stimmhafter velarer Plosiv',
// 		ɠ: 'Stimmhafter velarer Implosiv',
// 		ɢ: 'Stimmhafter uvularer Plosiv',
// 		ʛ: 'Stimmhafter uvularer Implosiv',
// 		ɣ: 'Stimmhafter velarer Frikativ',
// 		ɤ: 'Ungerundeter halbgeschlossener Hinterzungenvokal',
// 		h: 'Stimmloser glottaler Frikativ',
// 		ħ: 'Stimmloser pharyngaler Frikativ',
// 		ɦ: 'Stimmhafter glottaler Frikativ',
// 		ɧ: 'Stimmloser velopalataler Frikativ',
// 		ʜ: 'Stimmloser epiglottaler Frikativ',
// 		ɥ: 'Labiopalataler Approximant',
// 		i: 'Ungerundeter geschlossener Vorderzungenvokal',
// 		ĩ: 'Ungerundeter geschlossener Vorderzungennasalvokal',
// 		ɨ: 'Ungerundeter geschlossener Zentralvokal',
// 		ɪ: 'Zentralisierter fast geschlossener Vorderzungenvokal',
// 		ɯ: 'Ungerundeter geschlossener Hinterzungenvokal',
// 		j: 'Stimmhafter palataler Approximant',
// 		ʝ: 'Stimmhafter palataler Frikativ',
// 		ɟ: 'Stimmhafter palataler Plosiv',
// 		ʄ: 'Stimmhafter palataler Implosiv',
// 		k: 'Stimmloser velarer Plosiv',
// 		k͡x: 'Stimmlose velare Affrikate',
// 		l: 'Lateraler alveolarer Approximant',
// 		ɫ: 'Velarisierter lateraler Approximant',
// 		ɬ: 'Stimmloser lateraler Frikativ',
// 		ɭ: 'Lateraler retroflexer Approximant',
// 		ʟ: 'Lateraler velarer Approximant',
// 		ɮ: 'Stimmhafter lateraler Frikativ',
// 		ʎ: 'Stimmhafter lateraler palataler Approximant',
// 		m: 'Stimmhafter bilabialer Nasal',
// 		ɱ: 'Stimmhafter labiodentaler Nasal',
// 		n: 'Stimmhafter alveolarer Nasal',
// 		ɲ: 'Stimmhafter palataler Nasal',
// 		ŋ: 'Stimmhafter velarer Nasal',
// 		ɳ: 'Stimmhafter retroflexer Nasal',
// 		ɴ: 'Stimmhafter uvularer Nasal',
// 		o: 'Gerundeter halbgeschlossener Hinterzungenvokal',
// 		õ: 'Gerundeter halbgeschlossener Hinterzungennasalvokal',
// 		ɵ: 'Gerundeter halbgeschlossener Zentralvokal',
// 		ø: 'Gerundeter halbgeschlossener Vorderzungenvokal',
// 		ɞ: 'Gerundeter halboffener Zentralvokal',
// 		œ: 'Gerundeter halboffener Vorderzungenvokal (oe-Ligatur)',
// 		œ̃: 'Gerundeter halboffener Vorderzungennasalvokal',
// 		ɶ: 'Gerundeter offener Vorderzungenvokal',
// 		ʊ: 'Gerundeter zentralisierter fast geschlossener Hinterzungenvokal',
// 		ʘ: 'Bilabialer Klick',
// 		p: 'Stimmloser bilabialer Plosiv',
// 		p͡f: 'Stimmlose labiodentale Affrikate',
// 		q: 'Stimmloser uvularer Plosiv',
// 		r: 'Stimmhafter alveolarer Vibrant',
// 		ɾ: 'Stimmhafter alveolarer Tap',
// 		ɺ: 'Stimmhafter lateraler Flap',
// 		ɽ: 'Stimmhafter retroflexer Flap',
// 		ɹ: 'Stimmhafter alveolarer Approximant',
// 		ɻ: 'Stimmhafter retroflexer Approximant',
// 		ʀ: 'Stimmhafter uvularer Vibrant',
// 		ʁ: 'Stimmhafter uvularer Frikativ',
// 		r̝: 'Stimmhafter alveolarer frikativer Vibrant',
// 		s: 'Stimmloser alveolarer Frikativ',
// 		ʂ: 'Stimmloser retroflexer Frikativ',
// 		ʃ: 'Stimmloser postalveolarer Frikativ',
// 		s͡f: 'Stimmloser labiodental-alveolarer Frikativ',
// 		t: 'Stimmloser alveolarer Plosiv',
// 		ʈ: 'Stimmloser retroflexer Plosiv',
// 		θ: 'Stimmloser dentaler Frikativ',
// 		t͡s: 'Stimmlose alveolare Affrikate',
// 		t͡ʃ: 'Stimmlose postalveolare Affrikate',
// 		t̠͡ɕ: 'Stimmlose alveolopalatale Affrikate',
// 		ʈ͡ʂ: 'Stimmlose retroflexe Affrikate',
// 		u: 'Gerundeter geschlossener Hinterzungenvokal',
// 		ũ: 'Gerundeter geschlossener Hinterzungennasalvokal',
// 		ʉ: 'Gerundeter geschlossener Zentralvokal',
// 		v: 'Stimmhafter labiodentaler Frikativ',
// 		v̊: 'Halb-stimmhafter labiodentaler Frikativ',
// 		ʋ: 'Stimmhafter labiodentaler Approximant',
// 		ѵ: 'Stimmhafter labiodentaler Flap',
// 		w: 'Stimmhafter labiovelarer Approximant',
// 		w̃: 'Nasalierter stimmhafter labiovelarer Approximant',
// 		ʍ: 'Stimmloser labiovelarer Frikativ',
// 		ɰ: 'Stimmhafter velarer Approximant',
// 		x: 'Stimmloser velarer Frikativ',
// 		χ: 'Stimmloser uvularer Frikativ',
// 		y: 'Gerundeter geschlossener Vorderzungenvokal',
// 		ʏ: 'Gerundeter zentralisierter fast geschlossener Vorderzungenvokal',
// 		z: 'Stimmhafter alveolarer Frikativ',
// 		ʑ: 'Stimmhafter alveolopalataler Frikativ',
// 		ʐ: 'Stimmhafter retroflexer Frikativ',
// 		ʒ: 'Stimmhafter postalveolarer Frikativ',
// 		z͡v: 'Stimmhafter labiodental-alveolarer Frikativ',
// 	};

// 	const CONDITION_BASE = ['Keine Bedingung', 'Wortanfang', 'Wortende'];

// 	// current filter for phoneme selects
// 	let currentFilter = '';

// 	// Build UI into container (collapsible)
// 	function buildUI(container) {
// 		// outer
// 		const wrapper = document.createElement('div');
// 		const btn = document.createElement('button');
// 		btn.type = 'button';
// 		btn.className = 'btn btn-sm btn-outline-secondary mb-2';
// 		btn.textContent = '▾ Ausspracheregeln';
// 		btn.setAttribute('aria-expanded', 'true');
// 		wrapper.appendChild(btn);

// 		const inner = document.createElement('div');
// 		inner.style.display = 'block';
// 		wrapper.appendChild(inner);

// 		// top controls
// 		const rowTop = document.createElement('div');
// 		rowTop.className = 'mb-2 d-flex align-items-center';
// 		const langLabel = document.createElement('label');
// 		langLabel.textContent = 'Sprache: ';
// 		langLabel.className = 'mr-2';
// 		const langSelect = document.createElement('select');
// 		langSelect.className = 'form-control form-control-sm mr-2';
// 		LANGS.forEach((l) => {
// 			const o = document.createElement('option');
// 			o.value = l;
// 			o.textContent = l;
// 			langSelect.appendChild(o);
// 		});
// 		const exportBtn = document.createElement('button');
// 		exportBtn.type = 'button';
// 		exportBtn.className = 'btn btn-sm btn-outline-primary mr-2';
// 		exportBtn.textContent = 'Export (JSON)';
// 		const importBtn = document.createElement('button');
// 		importBtn.type = 'button';
// 		importBtn.className = 'btn btn-sm btn-outline-secondary mr-2';
// 		importBtn.textContent = 'Import (Datei)';
// 		const importFile = document.createElement('input');
// 		importFile.type = 'file';
// 		importFile.accept = 'application/json';
// 		importFile.style.display = 'none';
// 		const pasteBtn = document.createElement('button');
// 		pasteBtn.type = 'button';
// 		pasteBtn.className = 'btn btn-sm btn-info mr-2';
// 		pasteBtn.textContent = 'Aus Zwischenablage importieren';
// 		const importArea = document.createElement('textarea');
// 		importArea.className = 'form-control form-control-sm mr-2';
// 		importArea.placeholder = 'JSON hier einfügen und auf Import klicken';
// 		// importArea.style.width = '360px';
// 		// importArea.style.height = '60px';

// 		// example JSON
// 		const example = {
// 			language: 'Deutsche Aussprache',
// 			rules: [
// 				{graphem: 'ch', phoneme: 'x', conditions: ['Nach Konsonant']},
// 				{graphem: 'x', phoneme: 'ks', conditions: ['Vor benutzerdefinierten Phonem::ks']},
// 				{graphem: 'sch', phoneme: 'ʃ', conditions: []},
// 			],
// 		};
// 		importArea.value = JSON.stringify(example, null, 2);

// 		rowTop.appendChild(langLabel);
// 		rowTop.appendChild(langSelect);
// 		rowTop.appendChild(exportBtn);
// 		rowTop.appendChild(importBtn);
// 		rowTop.appendChild(importFile);
// 		inner.appendChild(rowTop);

// 		const rowPaste = document.createElement('div');
// 		rowPaste.className = 'mb-2 d-flex align-items-start';
// 		rowPaste.appendChild(pasteBtn);
// 		rowPaste.appendChild(importArea);
// 		inner.appendChild(rowPaste);

// 		// Table
// 		const table = document.createElement('table');
// 		table.className = 'table table-sm table-bordered';
// 		table.id = 'pron-rules-table';
// 		const thead = document.createElement('thead');
// 		const headerRow = document.createElement('tr');
// 		['Graphem', 'Phonem', 'Bedingungen'].forEach((h) => {
// 			const th = document.createElement('th');
// 			th.textContent = h;
// 			headerRow.appendChild(th);
// 		});
// 		thead.appendChild(headerRow);
// 		table.appendChild(thead);
// 		const tbody = document.createElement('tbody');
// 		table.appendChild(tbody);
// 		inner.appendChild(table);

// 		const addRowsBtn = document.createElement('button');
// 		addRowsBtn.type = 'button';
// 		addRowsBtn.className = 'btn btn-sm btn-outline-primary';
// 		addRowsBtn.textContent = '+ Weitere Reihen hinzufügen';
// 		inner.appendChild(addRowsBtn);

// 		// helper: populate phoneme select
// 		function populatePhonemeSelect(sel, filter) {
// 			sel.innerHTML = '';
// 			const oc = document.createElement('option');
// 			oc.value = '__custom__';
// 			oc.textContent = 'Benutzerdefiniert';
// 			sel.appendChild(oc);
// 			const f = (filter || '').toLowerCase();
// 			IPA_OPTIONS.forEach((sym) => {
// 				if (f) {
// 					const desc =
// 						IPA_DESCRIPTIONS && IPA_DESCRIPTIONS[sym] ? IPA_DESCRIPTIONS[sym] : '';
// 					if (!(String(sym).toLowerCase().includes(f) || desc.toLowerCase().includes(f)))
// 						return;
// 				}
// 				const o = document.createElement('option');
// 				o.value = sym;
// 				const desc = IPA_DESCRIPTIONS && IPA_DESCRIPTIONS[sym];
// 				o.textContent = desc ? sym + ' — ' + desc : sym;
// 				sel.appendChild(o);
// 			});
// 		}

// 		function addConditionOptionsToSelect(sel) {
// 			sel.innerHTML = '';
// 			CONDITION_BASE.forEach((c) => {
// 				const o = document.createElement('option');
// 				o.value = c;
// 				o.textContent = c;
// 				sel.appendChild(o);
// 			});
// 			// custom entries
// 			[
// 				'Vor benutzerdefinierten Phonem',
// 				'Nach benutzerdefinierten Phonem',
// 				'Vor benutzerdefiniertem Graphem',
// 				'Nach benutzerdefiniertem Graphem',
// 			].forEach((v) => {
// 				const o = document.createElement('option');
// 				o.value = v;
// 				o.textContent = v;
// 				sel.appendChild(o);
// 			});
// 			IPA_OPTIONS.forEach((sym) => {
// 				const desc =
// 					IPA_DESCRIPTIONS && IPA_DESCRIPTIONS[sym] ? ' — ' + IPA_DESCRIPTIONS[sym] : '';
// 				const o1 = document.createElement('option');
// 				o1.value = 'Vor ' + sym;
// 				o1.textContent = 'Vor ' + sym + desc;
// 				sel.appendChild(o1);
// 				const o2 = document.createElement('option');
// 				o2.value = 'Nach ' + sym;
// 				o2.textContent = 'Nach ' + sym + desc;
// 				sel.appendChild(o2);
// 			});
// 		}

// 		// add a single row
// 		function addRow(tbodyEl, data) {
// 			const tr = document.createElement('tr');
// 			// graphem
// 			const tdG = document.createElement('td');
// 			const inpG = document.createElement('input');
// 			inpG.type = 'text';
// 			inpG.className = 'form-control form-control-sm';
// 			inpG.value = data && data.graphem ? data.graphem : '';
// 			tdG.appendChild(inpG);
// 			tr.appendChild(tdG);

// 			// phoneme cell
// 			const tdP = document.createElement('td');
// 			const wrapP = document.createElement('div');
// 			wrapP.className = 'align-items-center';
// 			const selP = document.createElement('select');
// 			selP.className = 'form-control form-control-sm phoneme-select';
// 			populatePhonemeSelect(selP, currentFilter);
// 			const inpPText = document.createElement('input');
// 			inpPText.type = 'text';
// 			inpPText.className = 'form-control form-control-sm phoneme-text pa-2 mt-2';
// 			inpPText.placeholder = 'Benutzerdefiniertes Phonem';
// 			if (data && data.phoneme) {
// 				if (IPA_OPTIONS.indexOf(data.phoneme) !== -1) {
// 					selP.value = data.phoneme;
// 					inpPText.style.display = 'none';
// 				} else {
// 					selP.value = '__custom__';
// 					inpPText.value = data.phoneme;
// 					inpPText.style.display = '';
// 				}
// 			} else {
// 				selP.value = '__custom__';
// 				inpPText.style.display = '';
// 			}
// 			selP.addEventListener('change', () => {
// 				if (selP.value === '__custom__') inpPText.style.display = '';
// 				else inpPText.style.display = 'none';
// 			});
// 			wrapP.appendChild(selP);
// 			wrapP.appendChild(inpPText);
// 			tdP.appendChild(wrapP);
// 			tr.appendChild(tdP);

// 			// first condition
// 			const tdC1 = document.createElement('td');
// 			const selC1 = document.createElement('select');
// 			selC1.className = 'form-control form-control-sm';
// 			addConditionOptionsToSelect(selC1);
// 			const inpC1 = document.createElement('input');
// 			inpC1.type = 'text';
// 			inpC1.className = 'form-control form-control-sm cond-custom-input pa-2 mt-2';
// 			inpC1.placeholder = 'Benutzerdefiniertes Graphem/Phonem';
// 			inpC1.style.display = 'none';
// 			if (data && data.conditions && data.conditions[0]) {
// 				const v = data.conditions[0];
// 				if (typeof v === 'string' && v.indexOf('::') !== -1) {
// 					const parts = v.split('::');
// 					selC1.value = parts[0];
// 					inpC1.value = parts[1] || '';
// 					inpC1.style.display = '';
// 				} else selC1.value = v;
// 			}
// 			selC1.addEventListener('change', () => {
// 				const vv = selC1.value || '';
// 				if (vv.includes('benutzer')) inpC1.style.display = '';
// 				else inpC1.style.display = 'none';
// 			});
// 			tdC1.appendChild(selC1);
// 			tdC1.appendChild(inpC1);
// 			tr.appendChild(tdC1);

// 			// // add-condition button
// 			// const tdAdd = document.createElement('td');
// 			// const addCondBtn = document.createElement('button');
// 			// addCondBtn.type = 'button';
// 			// addCondBtn.className = 'btn btn-sm btn-outline-success';
// 			// addCondBtn.textContent = '+';
// 			// tdAdd.appendChild(addCondBtn);
// 			// tr.appendChild(tdAdd);

// 			tbodyEl.appendChild(tr);

// 			// addCondBtn.addEventListener('click', () => {
// 			// 	const currentConditions = tr.querySelectorAll('select');
// 			// 	const condSelects = Array.from(currentConditions).slice(1); // after phonem
// 			// 	if (condSelects.length >= 5) return;
// 			// 	const tdNew = document.createElement('td');
// 			// 	const selNew = document.createElement('select');
// 			// 	selNew.className = 'form-control form-control-sm';
// 			// 	addConditionOptionsToSelect(selNew);
// 			// 	const inpNew = document.createElement('input');
// 			// 	inpNew.type = 'text';
// 			// 	inpNew.className = 'form-control form-control-sm cond-custom-input ml-2';
// 			// 	inpNew.placeholder = 'z.B. ks';
// 			// 	inpNew.style.display = 'none';
// 			// 	selNew.addEventListener('change', () => {
// 			// 		if ((selNew.value || '').includes('benutzer')) inpNew.style.display = '';
// 			// 		else inpNew.style.display = 'none';
// 			// 	});
// 			// 	tdNew.appendChild(selNew);
// 			// 	tdNew.appendChild(inpNew);
// 			// 	tr.insertBefore(tdNew, tdAdd);
// 			// 	saveToStorage();
// 			// });
// 		}

// 		function getRulesJSON() {
// 			const lang = wrapper.querySelector('select').value;
// 			const rows = [];
// 			const trs = tbody.querySelectorAll('tr');
// 			trs.forEach((tr) => {
// 				const graphem =
// 					(tr.querySelector('input') && tr.querySelector('input').value.trim()) || '';
// 				const phonTextEl = tr.querySelector('input.phoneme-text');
// 				const phonSelEl = tr.querySelector('select.phoneme-select');
// 				let phoneme = '';
// 				if (phonTextEl && phonTextEl.value && phonTextEl.value.trim())
// 					phoneme = phonTextEl.value.trim();
// 				else if (phonSelEl && phonSelEl.value && phonSelEl.value !== '__custom__')
// 					phoneme = phonSelEl.value;
// 				const selects = tr.querySelectorAll('select');
// 				const conds = [];
// 				for (let i = 1; i < selects.length; i++) {
// 					const s = selects[i];
// 					const val = s.value;
// 					const td = s.parentElement || s.closest('td');
// 					let customVal = '';
// 					if (td) {
// 						const cust =
// 							td.querySelector && td.querySelector('input.cond-custom-input');
// 						if (cust && cust.value && cust.value.trim()) customVal = cust.value.trim();
// 					}
// 					if (customVal) conds.push(val + '::' + customVal);
// 					else conds.push(val);
// 				}
// 				if (graphem || (conds && conds.length > 0) || phoneme)
// 					rows.push({graphem, phoneme, conditions: conds});
// 			});
// 			const map = {};
// 			rows.forEach((r) => {
// 				const key = (r.graphem || '') + '||' + (r.phoneme || '');
// 				if (!map[key]) map[key] = {graphem: r.graphem, phoneme: r.phoneme, conditions: []};
// 				(r.conditions || []).forEach((c) => {
// 					if (!c) return;
// 					if (map[key].conditions.indexOf(c) === -1) map[key].conditions.push(c);
// 				});
// 			});
// 			const out = Object.keys(map).map((k) => map[k]);
// 			return {language: lang, rules: out};
// 		}

// 		function loadFromJSON(obj) {
// 			try {
// 				tbody.innerHTML = '';
// 				const langSel = wrapper.querySelector('select');
// 				if (obj.language) langSel.value = obj.language;
// 				const rules = Array.isArray(obj.rules) ? obj.rules : [];
// 				const targetCount = Math.max(30, rules.length);
// 				for (let i = 0; i < targetCount; i++) {
// 					const data = rules[i] || null;
// 					addRow(tbody, data);
// 					if (data && data.conditions && data.conditions.length > 1) {
// 						const tr = tbody.lastChild;
// 						for (let c = 1; c < data.conditions.length; c++) {
// 							const addBtn = tr.querySelector('button');
// 							if (addBtn) addBtn.click();
// 							const selects = tr.querySelectorAll('select');
// 							if (selects && selects.length) {
// 								const last = selects[selects.length - 1];
// 								const raw = data.conditions[c];
// 								if (typeof raw === 'string' && raw.indexOf('::') !== -1) {
// 									const parts = raw.split('::');
// 									last.value = parts[0];
// 									const td = last.parentElement || last.closest('td');
// 									if (td) {
// 										const cust =
// 											td.querySelector &&
// 											td.querySelector('input.cond-custom-input');
// 										if (cust) {
// 											cust.value = parts[1] || '';
// 											cust.style.display = '';
// 										}
// 									}
// 								} else last.value = raw;
// 							}
// 						}
// 					}
// 				}
// 				saveToStorage();
// 			} catch (e) {
// 				console.error(e);
// 			}
// 		}

// 		function saveToStorage() {
// 			try {
// 				const j = getRulesJSON();
// 				localStorage.setItem(STORAGE_KEY, JSON.stringify(j));
// 			} catch (e) {}
// 		}
// 		function loadFromStorage() {
// 			try {
// 				const raw = localStorage.getItem(STORAGE_KEY);
// 				if (!raw) return null;
// 				const obj = JSON.parse(raw);
// 				return obj;
// 			} catch (e) {
// 				return null;
// 			}
// 		}

// 		function loadPreset(name) {
// 			if (name === 'Deutsche Aussprache') {
// 				const alphaMap = {
// 					a: 'a',
// 					b: 'b',
// 					c: 'k',
// 					d: 'd',
// 					e: 'e',
// 					f: 'f',
// 					g: 'ɡ',
// 					h: 'h',
// 					i: 'i',
// 					j: 'j',
// 					k: 'k',
// 					l: 'l',
// 					m: 'm',
// 					n: 'n',
// 					o: 'o',
// 					p: 'p',
// 					q: 'q',
// 					r: 'r',
// 					s: 's',
// 					t: 't',
// 					u: 'u',
// 					v: 'v',
// 					w: 'v',
// 					x: 'ks',
// 					y: 'y',
// 					z: 'ts',
// 				};
// 				const rules = [
// 					{graphem: 'sch', phoneme: 'ʃ', conditions: []},
// 					{graphem: 'ch', phoneme: 'x', conditions: ['Nach Konsonant']},
// 					{graphem: 'ch', phoneme: 'ç', conditions: ['Nach Vokal']},
// 				];
// 				Object.keys(alphaMap).forEach((g) =>
// 					rules.push({graphem: g, phoneme: alphaMap[g], conditions: []})
// 				);
// 				return {language: name, rules};
// 			}
// 			if (name === 'Englische Aussprache')
// 				return {
// 					language: name,
// 					rules: [
// 						{graphem: 'th', phoneme: 'θ', conditions: []},
// 						{graphem: 'th', phoneme: 'ð', conditions: []},
// 						{graphem: 'sh', phoneme: 'ʃ', conditions: []},
// 					],
// 				};
// 			if (name === 'Französische Aussprache')
// 				return {
// 					language: name,
// 					rules: [
// 						{graphem: 'eau', phoneme: 'o', conditions: []},
// 						{graphem: 'ou', phoneme: 'u', conditions: []},
// 					],
// 				};
// 			if (name === 'Spanische Aussprache')
// 				return {language: name, rules: [{graphem: 'ñ', phoneme: 'ɲ', conditions: []}]};
// 			if (name === 'Italienische Aussprache')
// 				return {language: name, rules: [{graphem: 'ch', phoneme: 'k', conditions: []}]};
// 			return null;
// 		}

// 		function debounce(fn, wait) {
// 			let t;
// 			return function () {
// 				clearTimeout(t);
// 				t = setTimeout(() => fn.apply(this, arguments), wait);
// 			};
// 		}

// 		// wire buttons
// 		importBtn.addEventListener('click', () => importFile.click());
// 		importFile.addEventListener('change', (ev) => {
// 			const f = ev.target.files && ev.target.files[0];
// 			if (!f) return;
// 			const r = new FileReader();
// 			r.onload = () => {
// 				try {
// 					const obj = JSON.parse(r.result);
// 					loadFromJSON(obj);
// 				} catch (e) {
// 					alert('Ungültiges JSON');
// 				}
// 			};
// 			r.readAsText(f);
// 		});

// 		pasteBtn.addEventListener('click', async () => {
// 			const raw = importArea.value && importArea.value.trim();
// 			if (raw) {
// 				try {
// 					const obj = JSON.parse(raw);
// 					loadFromJSON(obj);
// 					return;
// 				} catch (e) {
// 					alert('Ungültiges JSON im Textfeld');
// 					return;
// 				}
// 			}
// 			try {
// 				if (navigator.clipboard && navigator.clipboard.readText) {
// 					const text = await navigator.clipboard.readText();
// 					if (!text) {
// 						alert('Zwischenablage ist leer');
// 						return;
// 					}
// 					const obj = JSON.parse(text);
// 					loadFromJSON(obj);
// 				} else {
// 					alert('Clipboard API nicht verfügbar - bitte JSON in das Textfeld einfügen');
// 				}
// 			} catch (err) {
// 				alert('Fehler beim Einlesen der Zwischenablage oder ungültiges JSON');
// 			}
// 		});

// 		exportBtn.addEventListener('click', () => {
// 			const j = getRulesJSON();
// 			const s = JSON.stringify(j, null, 2);
// 			if (navigator.clipboard && navigator.clipboard.writeText)
// 				navigator.clipboard.writeText(s).catch(() => {});
// 			const blob = new Blob([s], {type: 'application/json'});
// 			const url = URL.createObjectURL(blob);
// 			const a = document.createElement('a');
// 			a.href = url;
// 			a.download = 'ausspracheregeln.json';
// 			document.body.appendChild(a);
// 			a.click();
// 			a.remove();
// 			URL.revokeObjectURL(url);
// 		});

// 		langSelect.addEventListener('change', () => {
// 			if (langSelect.value === 'Benutzerdefinierte Ausspracheregeln') return;
// 			const preset = loadPreset(langSelect.value);
// 			if (preset) loadFromJSON(preset);
// 		});

// 		btn.addEventListener('click', () => {
// 			const isOpen = inner.style.display !== 'none';
// 			inner.style.display = isOpen ? 'none' : 'block';
// 			btn.textContent = isOpen ? '▸ Ausspracheregeln' : '▾ Ausspracheregeln';
// 			btn.setAttribute('aria-expanded', (!isOpen).toString());
// 		});

// 		// initial rows
// 		for (let i = 0; i < 30; i++) addRow(tbody);
// 		addRowsBtn.addEventListener('click', () => {
// 			for (let i = 0; i < 5; i++) addRow(tbody);
// 			saveToStorage();
// 		});

// 		// load saved
// 		const saved = loadFromStorage();
// 		if (saved) {
// 			if (saved.language) langSelect.value = saved.language;
// 			loadFromJSON(saved);
// 		}

// 		table.addEventListener(
// 			'input',
// 			debounce(() => {
// 				saveToStorage();
// 			}, 300)
// 		);
// 		table.addEventListener(
// 			'change',
// 			debounce(() => {
// 				saveToStorage();
// 			}, 300)
// 		);

// 		// attach to container
// 		container.appendChild(wrapper);
// 	}

// 	// initialize on DOM
// 	function init() {
// 		const container = document.getElementById('pronunciation-rules-container');
// 		if (!container) return;
// 		buildUI(container);
// 	}

// 	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
// 	else init();

// 	// expose helpers
// 	if (typeof window !== 'undefined')
// 		window.getPronunciationRules = function () {
// 			try {
// 				return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
// 			} catch (e) {
// 				return {};
// 			}
// 		};
// })();
