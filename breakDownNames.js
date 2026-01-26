(function () {
	/**
	 * Teilt ein Array von Namen in einzelne Buchstaben und sammelt
	 * diese in einem Array von Objekten pro Positionsindex.
	 * Beispiel: ["Max", "Erika"] => [ {position:1, letters:['M','E']}, {position:2, letters:['a','r']}, ... ]
	 *
	 * @param {string[]} nameArray - Array mit Namen (je Eintrag ein Name)
	 * @returns {Array.<{position:number,letters:string[]}>} positionsObjects
	 */
	function breakDownNames(nameArray) {
		if (!Array.isArray(nameArray) || nameArray.length === 0) {
			return [];
		}

		// Erzeuge für jeden Namen ein Char-Array (korrekte Unicode-Aufteilung)
		const namesChars = nameArray.map(rawName => {
			const s = (typeof rawName === 'string') ? rawName.trim() : '';
			return [...s];
		});

		// Bestimme maximale Länge (anzahl Positionen)
		const maxLen = namesChars.reduce((max, arr) => Math.max(max, arr.length), 0);

		const positionsObjects = [];

		for (let pos = 0; pos < maxLen; pos++) {
			const letters = namesChars.map(chars => (typeof chars[pos] === 'undefined' ? '' : chars[pos]));
			positionsObjects.push({ position: pos + 1, letters });
		}

		return positionsObjects;
	}

	// Im globalen Scope verfügbar machen (Browser): window.breakDownNames
	if (typeof window !== 'undefined') {
		window.breakDownNames = breakDownNames;
	}

	// Für Node/Module-Umgebungen (optional)
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { breakDownNames };
	}
})();

// Beispiel:
// const positions = breakDownNames(['Max','Erika','Hans']);
// console.log(positions);

