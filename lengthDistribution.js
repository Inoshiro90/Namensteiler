(function () {
	function calculateLengthDistribution(nameArray) {
		if (!Array.isArray(nameArray)) return [];
		const counts = {};
		const total = nameArray.length;
		nameArray.forEach((n) => {
			const s = typeof n === 'string' ? n.trim() : '';
			const len = s.length;
			counts[len] = (counts[len] || 0) + 1;
		});

		const arr = Object.keys(counts).map((k) => {
			const l = Number(k);
			return {length: l, count: counts[k], probability: counts[k] / total};
		});
		arr.sort((a, b) => b.length - a.length);
		return arr;
	}

	function displayLengthDistribution(distribution, containerId = 'results') {
		const container = document.getElementById(containerId);
		if (!container) return;

		const header = document.createElement('h3');
		header.textContent = 'Namenslängenverteilung';
		container.appendChild(header);

		if (!Array.isArray(distribution) || distribution.length === 0) {
			const p = document.createElement('p');
			p.textContent = 'Keine Namen vorhanden.';
			container.appendChild(p);
			return;
		}

		const table = document.createElement('table');
		table.className = 'table table-sm table-striped';
		const thead = document.createElement('thead');
		thead.innerHTML = '<tr><th>Länge</th><th>Anzahl</th><th>Anteil in Prozent</th></tr>';
		table.appendChild(thead);
		const tbody = document.createElement('tbody');

		distribution.forEach((item) => {
			const tr = document.createElement('tr');
			const tdLen = document.createElement('td');
			tdLen.textContent = String(item.length);
			const tdCount = document.createElement('td');
			tdCount.textContent = String(item.count);
			const tdProb = document.createElement('td');
			tdProb.textContent = (item.probability * 100).toFixed(2).replace('.', ',');
			tr.appendChild(tdLen);
			tr.appendChild(tdCount);
			tr.appendChild(tdProb);
			tbody.appendChild(tr);
		});

		table.appendChild(tbody);
		container.appendChild(table);
	}

	if (typeof window !== 'undefined') {
		window.calculateLengthDistribution = calculateLengthDistribution;
		window.displayLengthDistribution = displayLengthDistribution;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {calculateLengthDistribution, displayLengthDistribution};
	}
})();
