'use strict';

const COLOURS = {
	0: '#555',
	1: '#d63a3a',
	2: '#e0553d',
	3: '#e07a2a',
	4: '#e0a020',
	5: '#c8c020',
	6: '#9ab820',
	7: '#4db870',
	8: '#2abda4',
	9: '#2aadcc',
	10: '#4a9ee8',
	11: '#7a7ef5',
	12: '#a060e8',
	13: '#d050c8',
	14: '#e040aa',
	15: '#f04880',
	16: '#f86858',
	17: '#f8b030',
	18: '#b0e038',
	19: '#38dca0',
	20: '#c8eeff',
};

// ─── KLASSEN-NAMEN ──────────────────────────────────────────────────
// Automatische Namensvergabe anhand des numerischen Klassen-Values
const CLASS_NAMES = {
	1:  'Stimmlose Plosive',
	2:  'Stimmhafte Plosive',
	3:  'Stimmlose Affrikate',
	4:  'Stimmhafte Affrikate',
	5:  'Stimmlose Frikative',
	6:  'Stimmhafte Frikative',
	7:  'Nasale',
	8:  'Laterale',
	9:  'Rhotische',
	10: 'Approximanten',
	11: 'Geschlossene Vokale',
	12: 'Mittlere Vokale',
	13: 'Offene Vokale',
};

// ─── PROFIL-CACHE & LADER ───────────────────────────────────────────
const _profileCache = {};

/**
 * Lädt ein Sprachprofil aus scripts/profiles/{id}.json (mit Cache).
 * Reichert jede Klasse automatisch mit dem Namen aus CLASS_NAMES an
 * und normalisiert `graphemes` zu einem kommagetrennten String,
 * wie er vom UI erwartet wird.
 *
 * @param {string} id  Profil-ID (entspricht dem Dateinamen ohne .json)
 * @returns {Promise<object|null>}
 */
async function loadProfile(id) {
	if (_profileCache[id]) return _profileCache[id];

	let profile;
	try {
		const resp = await fetch(`scripts/profiles/${id}.json`);
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		profile = await resp.json();
	} catch (err) {
		console.error(`[Namensteiler] Profil "${id}" konnte nicht geladen werden:`, err);
		return null;
	}

	// Klassen anreichern: Name aus CLASS_NAMES + graphemes als String normalisieren
	if (Array.isArray(profile.classes)) {
		profile.classes = profile.classes.map(cls => ({
			...cls,
			name: CLASS_NAMES[cls.value] ?? `Klasse ${cls.value}`,
			graphemes: Array.isArray(cls.graphemes)
				? cls.graphemes.join(', ')
				: cls.graphemes,
		}));
	}

	_profileCache[id] = profile;
	return profile;
}

const HINTS = {
	universal: 'Alexandra München Hassan Moussa Vanessa Allou Kwabena Asantewaa Nkrumah Emmanuel',
	german: 'Wolfgang Matthias Heidelberg Christoph Franziska Günther Müller Schröder',
	austrian: 'Adelheid Agatha Wolfram Annemarie Hanspeter Hubertus Luitpold',
	english: 'Jefferson Williams Christopher Alexander Margaret Elizabeth Andrew',
	american: 'Abagail Josephine Alexander Jefferson Washington Chicago',
	dutch: 'Wilhelmina Adriaan Cornelia Johannes Hendrika',
	belgian: 'Vandenbroecke Christophe Annelies Pieter Isabelle',
	swedish: 'Salminen Magnusson Björn Sigrid Ingrid Svensson Andersson',
	norwegian: 'Lorentzen Magnusson Ragnar Ingrid Sigrid Bjørnsen',
	danish: 'Sørensen Møller Rasmussen Agnethe Abelone Ingeborg',
	icelandic: 'Sigurdardóttir Jónsson Gudmundsson Magnússon',
	scottish: 'Ailsa Catriona Fionnuala Alasdair Coinneach Seumas',
	irish: 'Abaigeal Aideen Ailbhe Caoimhe Fionnuala Pádraig Séamus',
	french: 'Stéphanie Christophe Guillaume Geneviève Aurélie Thierry',
	french_canadian: 'Angèle Françoise Sébastien Geneviève Québec',
	spanish: 'Alejandro Guadalupe Sebastián Fernández González',
	portuguese: 'Mariazinha João Fernanda Gonçalves Carvalho',
	brazilian: 'Adriana Fernanda Rodrigues Cavalcanti Nascimento',
	italian: 'Francesca Alessandro Novella Giuseppina Matteo',
	romanian: 'Gheorghe Ioana Constantin Mihaela Bogdan Ștefan',
	russian: 'Anastasiya Aleksandrova Abasheva Abakumova',
	ukrainian: 'Anastasiya Anhelina Bohdana Volodymyr Oleksandra',
	polish: 'Adamczyk Andryszczyk Szczepański Małgorzata Zbigniew',
	czech_slovak: 'Dvořáček Novotná Procházka Šimková Václav',
	serbo_croatian: 'Aleksandra Adrijana Miroslav Svetlana Blagoje',
	bosnian: 'Adrijana Aldina Aisa Fatima Emir Damir',
	bulgarian: 'Aleksandrova Angelova Arabadzhieva Arnaudova',
	macedonian: 'Aleksandrova Anastasova Andonovska Todorovska',
	slovene: 'Aleksandra Alojzija Amalija Alenka Ajda',
	latvian: 'Krastiņš Bērziņš Ozols Kalniņš Āboltiņš',
	lithuanian: 'Abramavicius Adamavičienė Kazlauskas Petraitis',
	estonian: 'Kaljurand Alasoo Lepasepp Mäkinen Saarinen',
	finnish: 'Mäkinen Korhonen Salminen Niemi Virtanen Aino',
	hungarian: 'Kovács Szabó Horváth Tóth Varga Fehér Ágnes',
	greek: 'Papadopoulos Alexandropoulou Theofanis Katerina',
	albanian: 'Hoxha Shehu Dervishi Basha Gjoka Marku',
	turkish: 'Yıldız Kaya Demir Şahin Çelik Öztürk İsmail',
	azeri: 'Abbasova Abdullayeva Afandiyeva Aliyeva Hasanova',
	kazakh: 'Abdibek Abdirakhmanova Abdullayeva Abisheva',
	georgian: 'Beridze Kiknadze Khachidze Mgebrishvili Tsiklauri',
	tajik_uzbek: 'Abbosova Abdalimova Abdikarimova Abdurahmonova',
	arabic: 'Mohammed Fatimah Ibrahim Yassin Khaled Samira',
	persian: 'Aazam Abbaseh Abrisham Afagh Shahnaz Nasrin',
	kurdish: 'Adan Aheng Ajda Ajna Arjin Berivan Dilnoza',
	berber: 'Aalia Aludra Alzahra Amel Amina Amsah Tafat',
	hebrew: 'Noah Levi Samuel Hanna Sarah Rebecca',
	pashtun: 'Afia Ambrin Angeza Ariana Bakhtawara Farida',
	armenian: 'Adrine Aghavni Akabi Anahit Varduhi Arev',
	hindi: 'Abhilasha Aditi Agasthi Akanksha Abharan',
	bengali: 'Aabharana Aadarshini Aadhila Aadhya Aadishri',
	punjabi: 'Abinaash Adishree Agamjot Agampreet Ajaib',
	sinhalese: 'Achala Achini Amanthi Anjalika Anushka',
	ethiopian: 'Abaynesh Abeba Abebech Abenet Abrinet Miriam',
	japanese: 'Aika Aiko Aimi Aino Airi Ayaka Yuki Haruto',
	korean: 'Areum Bora Bo-kyung Bo-young Bit-na Daehyun',
	chinese: 'Ailing Anmei Bao Baoyu Meiling Xiuying Jiaming',
	mongolian: 'Altanchimeg Altangerel Altantsetseg Enkhmaa',
	vietnamese: 'Anh Dung Giang Lan Nguyen Thanh Linh Minh',
	thai_lao: 'Alisara Anchalee Anchana Angsumalin Anongrat',
	khmer: 'Achariya Akara Anchaly Arunny Bonavy Botum',
	indonesian: 'Adiratna Adiwidya Ambar Ambarningsih Sari',
	malay: 'Adiputeri Aishah Aisyah Azura Biru Bongsu',
	filipino: 'Maliwanag Ligaya Liwayway Bayani Lakandula',
	burmese: 'Aung Aye Chit Cho Hein Hla Hlaing Myint',
	akan: 'Kwabena Asantewaa Nkrumah Kyerematen Abenaa Moussa',
	nigerian: 'Abayomi Abebi Abeni Abeo Oluwakemi Adewale',
	senegalese: 'Aisha Adama Allabatou Allimatou Fatou Moussa',
	cameroonian: 'Aissatou Akaba Akwi Amandine Angèle Njiki',
	swahili: 'Abuya Achieng Achor Adongo Akello Akeyo',
	bantu: 'Amogelang Boikanyo Boipelo Boitumelo Bokamoso',
	congolese: 'Adero Antoinette Ayondela Bakaji Bisengo',
	south_african: 'Akhona Amaka Amohelang Anele Ayanda Thabo',
	maori: 'Ahuaiti Airini Amiria Aroha Mere Ngaio Tama',
};
