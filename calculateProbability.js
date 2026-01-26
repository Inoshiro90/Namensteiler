/*
 * calculateProbability.js ist ein Loader/Aggregator: Funktionen wurden in
 * separate Dateien ausgelagert (probabilities.js, lengthDistribution.js,
 * vowelConsonant.js, cvPatterns.js). Diese Datei bindet die Module im
 * Browser per Script-Injection ein und exportiert sie in Node via require().
 */

if (typeof module !== 'undefined' && module.exports) {
	const probs = require('./probabilities.js');
	const lengths = require('./lengthDistribution.js');
	const vc = require('./vowelConsonant.js');
	const cv = require('./cvPatterns.js');
	module.exports = Object.assign({}, probs, lengths, vc, cv);
} else if (typeof window !== 'undefined') {
	const files = ['probabilities.js', 'lengthDistribution.js', 'vowelConsonant.js', 'cvPatterns.js'];
	files.forEach((f) => {
		const s = document.createElement('script');
		s.src = f;
		s.async = false;
		document.head.appendChild(s);
	});
}
