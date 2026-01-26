function readNames(textarea) {
	if (!textarea) {
		return [];
	}

	const raw = textarea.value || '';
	const lines = raw.split(/\r?\n/);
	// Trimme jede Zeile und entferne leere / whitespace-only Zeilen
	let nameArray = lines.map((line) => line.trim()).filter((line) => line !== '');

	// Sortiere die Namen nach Länge absteigend (längster Name zuerst)
	nameArray = nameArray.sort((a, b) => b.length - a.length);

	// console.log(`Namen in nameArray: ${nameArray}`);
	// console.log(`Anzahl der Namen in nameArray: ${nameArray.length}`);
	return nameArray;
}
