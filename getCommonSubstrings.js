function getCommonSubstrings(str1, str2, minLength) {
	const len1 = str1.length;
	const len2 = str2.length;

	// DP-Tabelle (nur Zahlen)
	const table = Array.from({length: len1 + 1}, () => Array(len2 + 1).fill(0));

	const substrings = new Set();

	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			if (str1[i - 1] === str2[j - 1]) {
				table[i][j] = table[i - 1][j - 1] + 1;

				// Alle Substrings bis zur aktuellen Länge erfassen
				for (let l = minLength; l <= table[i][j]; l++) {
					substrings.add(str1.substring(i - l, i));
				}
			} else {
				table[i][j] = 0;
			}
		}
	}

	return substrings;
}
