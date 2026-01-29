function toCVPattern(str, vowelSet) {
	let pattern = '';
	for (const ch of str.toLowerCase()) {
		if (vowelSet.has(ch)) {
			pattern += 'V';
		} else if (/[a-zäöüß]/i.test(ch)) {
			pattern += 'C';
		}
	}
	return pattern;
}

const ALLOWED_CV_PATTERNS = new Set([
	// // Nur Vokale
	// 'V',
	// 'VV',
	// 'VVV',

	// // Nur Konsonanten
	// 'C',
	// 'CC',
	// 'CCC',

	// CV*
	'CV',
	'CVV',
	'CVVV',
	'CCV',
	'CCVV',
	'CCVVV',
	// 'CCCV',
	// 'CCCVV',
	// 'CCCVVV',

	// VC*
	'VC',
	'VVC',
	'VVVC',
	'VCC',
	'VVCC',
	'VVVCC',
	// 'VCCC',
	// 'VVCCC',
	// 'VVVCCC',

	// VCV*
	'VCV',
	'VVCV',
	'VVVCV',
	'VCVV',
	'VCVVV',
	'VVCVV',
	'VVCVVV',
	'VVVCVV',
	'VVVCVVV',

	// VCCV*
	'VCCV',
	'VVCCV',
	'VVVCCV',
	'VCCVV',
	'VCCVVV',
	'VVCCVV',
	'VVCCVVV',
	'VVVCCVV',
	'VVVCCVVV',

	// VCCCV*
	// 'VCCCV',
	// 'VVCCCV',
	// 'VVVCCCV',
	// 'VCCCVV',
	// 'VCCCVVV',
	// 'VVCCCVV',
	// 'VVCCCVVV',
	// 'VVVCCCVV',
	// 'VVVCCCVVV',

	// CVC*
	'CVC',
	'CCVC',
	// 'CCCVC',
	'CVCC',
	// 'CVCCC',
	// 'CCVCC',
	// 'CCVCCC',
	// 'CCCVCC',
	// 'CCCVCCC',

	// CVVC*
	'CVVC',
	'CCVVC',
	// 'CCCVVC',
	'CVVCC',
	// 'CVVCCC',
	'CCVVCC',
	// 'CCVVCCC',
	// 'CCCVVCC',
	// 'CCCVVCCC',

	// CVVVC*
	'CVVVC',
	'CCVVVC',
	// 'CCCVVVC',
	'CVVVCC',
	// 'CVVVCCC',
	'CCVVVCC',
	// 'CCVVVCCC',
	// 'CCCVVVCC',
	// 'CCCVVVCCC',
]);
