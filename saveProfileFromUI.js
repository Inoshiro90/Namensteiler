function saveProfileFromUI() {
	const profile = readSonorityClasses();
	LANGUAGE_PROFILES.de = structuredClone(profile);
	alert('Profil „Deutsch“ gespeichert.');
}
document.getElementById('saveProfileBtn').addEventListener('click', saveProfileFromUI);

function loadProfileToUI(profile) {
	const set = (id, arr) => {
		const el = document.getElementById(id);
		if (el && Array.isArray(arr)) el.value = arr.join(',');
	};

	set('openVowels', profile.openVowels);
	set('closeVowels', profile.closeVowels);
	set('semivowel', profile.semiVowels);
	set('liquidConsonants', profile.liquidConsonants);
	set('nasalConsonants', profile.nasalConsonants);
	set('fricativeConsonants', profile.fricativeConsonants);
	set('affricateConsonants', profile.affricateConsonants);
	set('plosiveConsonants', profile.plosiveConsonants);
	set('allowedOnsets', profile.allowedOnsets);
	set('allowedCodas', profile.allowedCodas);
}

document.getElementById('profileSelect').addEventListener('change', (e) => {
	const key = e.target.value;
	const profile = LANGUAGE_PROFILES[key];

	if (!profile) {
		alert('Dieses Profil ist noch nicht gespeichert.');
		return;
	}
	loadProfileToUI(profile);
});
