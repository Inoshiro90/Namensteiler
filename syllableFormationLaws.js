(function () {
	/**
	 * Getter für Sonoritätshierarchie aus Input-Feld
	 * @returns {Array} Array von Kategorien von niedrig zu hoch Sonorität
	 */
	window.getSonorityHierarchy = function () {
		try {
			const el = document.getElementById('sonorityHierarchyInput');
			if (!el) return ['plosive', 'fricative', 'nasal', 'liquid', 'glide', 'vowel'];
			const raw = String(el.value || '');
			if (!raw) return ['plosive', 'fricative', 'nasal', 'liquid', 'glide', 'vowel'];
			const parts = raw
				.split(/[,\s]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return parts.length > 0 ? parts : ['plosive', 'fricative', 'nasal', 'liquid', 'glide', 'vowel'];
		} catch (e) {
			return ['plosive', 'fricative', 'nasal', 'liquid', 'glide', 'vowel'];
		}
	};

	/**
	 * Getter für Affrikaten aus Input-Feld
	 * @returns {Set} Set von Affrikaten (ts, tsch, pf, dz, etc.)
	 */
	window.getAffricates = function () {
		try {
			const el = document.getElementById('affricatesInput');
			if (!el) return new Set(['ts', 'tsch', 'pf', 'dz']);
			const raw = String(el.value || '');
			if (!raw) return new Set(['ts', 'tsch', 'pf', 'dz']);
			const parts = raw
				.split(/[,\s]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return new Set(parts);
		} catch (e) {
			return new Set(['ts', 'tsch', 'pf', 'dz']);
		}
	};

	/**
	 * Getter für extrasilbische Grapheme aus Input-Feld
	 * @returns {Set} Set von extrasilbischen Graphemen (s, sp, st, str, etc.)
	 */
	window.getExtrasyllabicGraphemes = function () {
		try {
			const el = document.getElementById('extrasyllabicInput');
			if (!el) return new Set(['s', 'sp', 'st', 'str']);
			const raw = String(el.value || '');
			if (!raw) return new Set(['s', 'sp', 'st', 'str']);
			const parts = raw
				.split(/[,\s]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return new Set(parts);
		} catch (e) {
			return new Set(['s', 'sp', 'st', 'str']);
		}
	};

	/**
	 * Getter für unmögliche Konsonantenkombinationen aus Input-Feld
	 * @returns {Set} Set von verbotenen Clustern (tm, dm, pn, etc.)
	 */
	window.getForbiddenClusters = function () {
		try {
			const el = document.getElementById('forbiddenClustersInput');
			if (!el) return new Set(['tm', 'dm', 'pn', 'bp', 'kg', 'gk']);
			const raw = String(el.value || '');
			if (!raw) return new Set(['tm', 'dm', 'pn', 'bp', 'kg', 'gk']);
			const parts = raw
				.split(/[,\s]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return new Set(parts);
		} catch (e) {
			return new Set(['tm', 'dm', 'pn', 'bp', 'kg', 'gk']);
		}
	};

	/**
	 * Getter für maximale Konsonantencluster aus Input-Feld
	 * @returns {Object} {maxOnset: number, maxCoda: number}
	 */
	window.getMaxConsonantCluster = function () {
		try {
			const el = document.getElementById('maxConsonantClusterInput');
			if (!el) return { maxOnset: 3, maxCoda: 3, pattern: 'CCVCC' };
			const raw = String(el.value || '').toUpperCase();
			if (!raw) return { maxOnset: 3, maxCoda: 3, pattern: 'CCVCC' };

			// Parse pattern wie "CCVCC"
			const match = raw.match(/^(C+)V(C*)$/);
			if (match) {
				const maxOnset = match[1].length;
				const maxCoda = match[2].length;
				return { maxOnset, maxCoda, pattern: raw };
			}
			return { maxOnset: 3, maxCoda: 3, pattern: 'CCVCC' };
		} catch (e) {
			return { maxOnset: 3, maxCoda: 3, pattern: 'CCVCC' };
		}
	};

	/**
	 * Bestimmt den Sonoritätswert eines Konsonanten
	 * @param {string} consonant - Der Konsonant
	 * @param {Array} hierarchy - Sonoritätshierarchie
	 * @param {Set} affricates - Set von Affrikaten
	 * @returns {number} Sonoritätswert (höher = sonorer)
	 */
	window.getSonorityValue = function (consonant, hierarchy, affricates) {
		if (!consonant) return -1;
		const norm = consonant.toLowerCase();
		
		// Affrikaten: Nutze den Sonoritätswert des zweiten Elements
		if (affricates && affricates.has(norm)) {
			const lastChar = norm[norm.length - 1];
			if (hierarchy.includes('fricative') && /[sfv]/.test(lastChar)) {
				return hierarchy.indexOf('fricative');
			}
			if (hierarchy.includes('nasal') && /[mn]/.test(lastChar)) {
				return hierarchy.indexOf('nasal');
			}
		}

		// Heuristik für Konsonantentypen basierend auf Grapheme
		// Frikative (fricatives): f, v, s, z, sch, ch, etc.
		if (/[fvszhjč]|sch|th|sh/.test(norm)) {
			return hierarchy.indexOf('fricative');
		}
		// Plosive (plosives): p, b, t, d, k, g
		if (/[ptbdkg]/.test(norm) && norm.length === 1) {
			return hierarchy.indexOf('plosive');
		}
		// Nasale (nasals): m, n, ng
		if (/[mn]|ng/.test(norm)) {
			return hierarchy.indexOf('nasal');
		}
		// Liquide (liquids): l, r
		if (/[lr]/.test(norm)) {
			return hierarchy.indexOf('liquid');
		}
		// Gleitlaute (glides): w, j, y
		if (/[wjy]/.test(norm)) {
			return hierarchy.indexOf('glide');
		}

		// Fallback
		return hierarchy.length - 1;
	};

	/**
	 * Überprüft, ob ein Konsonantenpaar gegen die Sonority Sequencing Principle verstößt
	 * @param {string} c1 - Erster Konsonant
	 * @param {string} c2 - Zweiter Konsonant
	 * @param {Array} hierarchy - Sonoritätshierarchie
	 * @param {Set} affricates - Set von Affrikaten
	 * @returns {boolean} true wenn SSP-konform, false wenn Verstoß
	 */
	window.checkSSPCompliance = function (c1, c2, hierarchy, affricates) {
		const s1 = window.getSonorityValue(c1, hierarchy, affricates);
		const s2 = window.getSonorityValue(c2, hierarchy, affricates);
		
		// In onset: Sonorität sollte zum Vokal hin ansteigen
		// c1 < c2 (erstes Konsonant sollte weniger sonorant sein)
		return s1 < s2;
	};

	/**
	 * Validiert einen Konsonantenpair gegen die Sonority Sequencing Principle
	 * und gegen verbotene Cluster
	 * @param {string} c1 - Erster Konsonant
	 * @param {string} c2 - Zweiter Konsonant
	 * @param {Set} forbiddenClusters - Set von verbotenen Clustern
	 * @param {Array} hierarchy - Sonoritätshierarchie
	 * @param {Set} affricates - Set von Affrikaten
	 * @returns {boolean} true wenn Valid, false wenn Invalid
	 */
	window.isValidCluster = function (c1, c2, forbiddenClusters, hierarchy, affricates) {
		const cluster = (c1 + c2).toLowerCase();
		
		// Überprüfe gegen verbotene Cluster
		if (forbiddenClusters && forbiddenClusters.has(cluster)) {
			return false;
		}
		
		// Überprüfe SSP
		return window.checkSSPCompliance(c1, c2, hierarchy, affricates);
	};

	/**
	 * Getter für Sonoranten aus Input-Feld
	 * @returns {Set} Set von Sonoranten (m, n, l, r, j, w, etc.)
	 */
	window.getSonorants = function () {
		try {
			const el = document.getElementById('sonorantsInput');
			if (!el) return new Set(['m', 'n', 'ng', 'l', 'r', 'j', 'w']);
			const raw = String(el.value || '');
			if (!raw) return new Set(['m', 'n', 'ng', 'l', 'r', 'j', 'w']);
			const parts = raw
				.split(/[,\s]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return new Set(parts);
		} catch (e) {
			return new Set(['m', 'n', 'ng', 'l', 'r', 'j', 'w']);
		}
	};

	/**
	 * Getter für Obstruenten aus Input-Feld
	 * @returns {Set} Set von Obstruenten (p, b, t, d, k, g, f, v, s, z, etc.)
	 */
	window.getObstruents = function () {
		try {
			const el = document.getElementById('obstrutentsInput');
			if (!el) return new Set(['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'sch', 'ch', 'tsch']);
			const raw = String(el.value || '');
			if (!raw) return new Set(['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'sch', 'ch', 'tsch']);
			const parts = raw
				.split(/[,\s]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			return new Set(parts);
		} catch (e) {
			return new Set(['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'sch', 'ch', 'tsch']);
		}
	};

	/**
	 * Bewertet einen Onset (Silbenanfang) nach Silbenanlautgesetz
	 * Optimal: genau ein Konsonant
	 * @param {string} onset - Der Onset (z.B. "b", "str")
	 * @returns {number} Score (0-1, höher ist besser)
	 */
	window.scoreOnset = function (onset) {
		if (!onset || onset.length === 0) return 1.0; // Leerer Onset ist auch optimal
		if (onset.length === 1) return 1.0; // Genau ein Konsonant: optimal
		if (onset.length === 2) return 0.7; // Zwei Konsonanten: markiert
		if (onset.length === 3) return 0.4; // Drei Konsonanten: stark markiert
		return 0.1; // Vier oder mehr: sehr markiert
	};

	/**
	 * Bewertet eine Koda (Silbenende) nach Silbenauslautgesetz
	 * Optimal: keine Konsonanten
	 * @param {string} coda - Die Koda (z.B. "", "t", "nts")
	 * @returns {number} Score (0-1, höher ist besser)
	 */
	window.scoreCoda = function (coda) {
		if (!coda || coda.length === 0) return 1.0; // Leere Koda: optimal
		if (coda.length === 1) return 0.8; // Ein Konsonant: gut
		if (coda.length === 2) return 0.5; // Zwei Konsonanten: markiert
		if (coda.length === 3) return 0.2; // Drei Konsonanten: stark markiert
		return 0.05; // Vier oder mehr: sehr markiert
	};

	/**
	 * Bewertet einen Nukleus (Silbenkern) nach Silbenkerngesetz
	 * Optimal: Vokal; gut: Sonorant; markiert: Obstruent
	 * @param {string} nucleus - Der Nucleus (z.B. "a", "m", "b")
	 * @param {Set} vowels - Set von Vokalen
	 * @param {Set} sonorants - Set von Sonoranten
	 * @param {Set} obstruents - Set von Obstruenten
	 * @returns {number} Score (0-1, höher ist besser)
	 */
	window.scoreNucleus = function (nucleus, vowels, sonorants, obstruents) {
		if (!nucleus || nucleus.length === 0) return 0; // Kein Nucleus: ungültig
		
		const normalized = nucleus.toLowerCase();
		
		// Vokale sind optimal
		if (vowels && vowels.has(normalized)) return 1.0;
		
		// Sonoranten sind gut
		if (sonorants && sonorants.has(normalized)) return 0.7;
		
		// Obstruenten sind schwach
		if (obstruents && obstruents.has(normalized)) return 0.3;
		
		// Unbekannt: conservative Schätzung
		return 0.5;
	};

	/**
	 * Bewertet ein komplettes Morphem basierend auf Silbenbildungsgesetzen
	 * Diese Funktion versucht, das Morphem in Silben zu zerlegen und dann zu bewerten
	 * @param {string} morpheme - Das Morphem (z.B. "strength")
	 * @param {Set} vowels - Set von Vokalen
	 * @param {Set} sonorants - Set von Sonoranten
	 * @param {Set} obstruents - Set von Obstruenten
	 * @returns {number} Score (0-1, höher ist besser)
	 */
	window.scoreMorpheme = function (morpheme, vowels, sonorants, obstruents) {
		if (!morpheme || morpheme.length === 0) return 0;

		const normalized = morpheme.toLowerCase();
		
		// Einfache Heuristik: Zähle Vokale, Sonoranten, Obstruenten
		let vowelScore = 0;
		let sonorantScore = 0;
		let obstuentScore = 0;
		let components = 0;

		// Gehe durch das Morphem und versuche, Komponenten zu identifizieren
		let i = 0;
		while (i < normalized.length) {
			// Prüfe zuerst auf Digraphe (z.B. "ch", "ng", "sch")
			let matched = false;
			
			// Überprüfe 3-Zeichen-Kombinationen
			if (i + 3 <= normalized.length) {
				const tri = normalized.substring(i, i + 3);
				if (sonorants && sonorants.has(tri)) {
					sonorantScore += 0.7;
					components++;
					i += 3;
					matched = true;
				} else if (obstruents && obstruents.has(tri)) {
					obstuentScore += 0.3;
					components++;
					i += 3;
					matched = true;
				}
			}

			// Überprüfe 2-Zeichen-Kombinationen
			if (!matched && i + 2 <= normalized.length) {
				const di = normalized.substring(i, i + 2);
				if (sonorants && sonorants.has(di)) {
					sonorantScore += 0.7;
					components++;
					i += 2;
					matched = true;
				} else if (obstruents && obstruents.has(di)) {
					obstuentScore += 0.3;
					components++;
					i += 2;
					matched = true;
				}
			}

			// Überprüfe 1-Zeichen-Kombinationen
			if (!matched) {
				const ch = normalized.substring(i, i + 1);
				if (vowels && vowels.has(ch)) {
					vowelScore += 1.0;
					components++;
					i++;
					matched = true;
				} else if (sonorants && sonorants.has(ch)) {
					sonorantScore += 0.7;
					components++;
					i++;
					matched = true;
				} else if (obstruents && obstruents.has(ch)) {
					obstuentScore += 0.3;
					components++;
					i++;
					matched = true;
				}
			}

			// Wenn nichts passte, einfach weitergehen (z.B. Umlaute oder spezielle Zeichen)
			if (!matched) {
				i++;
			}
		}

		// Durchschnittlicher Score
		if (components === 0) return 0.5; // Fallback
		return (vowelScore + sonorantScore + obstuentScore) / components;
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			getSonorityHierarchy: window.getSonorityHierarchy,
			getAffricates: window.getAffricates,
			getExtrasyllabicGraphemes: window.getExtrasyllabicGraphemes,
			getForbiddenClusters: window.getForbiddenClusters,
			getMaxConsonantCluster: window.getMaxConsonantCluster,
			getSonorityValue: window.getSonorityValue,
			checkSSPCompliance: window.checkSSPCompliance,
			isValidCluster: window.isValidCluster,
			getSonorants: window.getSonorants,
			getObstruents: window.getObstruents,
			scoreOnset: window.scoreOnset,
			scoreCoda: window.scoreCoda,
			scoreNucleus: window.scoreNucleus,
			scoreMorpheme: window.scoreMorpheme
		};
	}
})();
