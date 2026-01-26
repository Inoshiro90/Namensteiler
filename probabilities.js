(function () {
	function calculateProbabilities(positions) {
		if (!Array.isArray(positions)) return [];

		return positions.map((pos) => {
			const letters = Array.isArray(pos.letters) ? pos.letters : [];
			const total = letters.length;
			const counts = {};

			letters.forEach((l) => {
				const raw = typeof l === 'string' ? l : String(l);
				const key = raw.trim();
				const norm = key === '' ? '' : key;
				counts[norm] = (counts[norm] || 0) + 1;
			});

			const probabilities = {};
			Object.keys(counts).forEach((k) => {
				probabilities[k] = counts[k] / total;
			});

			return {
				position: pos.position,
				total,
				counts,
				probabilities,
			};
		});
	}

	function displayProbabilities(probabilitiesByPosition, containerId = 'results') {
		const container = document.getElementById(containerId);
		if (!container) {
			console.warn(`Element #${containerId} nicht gefunden.`);
			return;
		}

		const block = document.createElement('div');
		block.className = 'probabilities-block';

		if (!Array.isArray(probabilitiesByPosition) || probabilitiesByPosition.length === 0) {
			const p = document.createElement('p');
			p.textContent = 'Keine Wahrscheinlichkeiten verfügbar.';
			block.appendChild(p);
			container.appendChild(block);
			return;
		}

		probabilitiesByPosition.forEach((pos) => {
			const h3 = document.createElement('h3');
			h3.textContent = `Position ${pos.position} (Anzahl Einträge: ${pos.total})`;
			block.appendChild(h3);

			const table = document.createElement('table');
			table.className = 'table table-sm table-bordered';
			const thead = document.createElement('thead');
			thead.innerHTML =
				'<tr><th>Buchstabe</th><th>Anzahl</th><th>Wahrscheinlichkeit in Prozent</th></tr>';
			table.appendChild(thead);

			const tbody = document.createElement('tbody');

			const keys = Object.keys(pos.counts || {});
			keys.sort((a, b) => {
				const ta = String(a).trim();
				const tb = String(b).trim();
				const aEmpty = ta === '';
				const bEmpty = tb === '';
				if (aEmpty && !bEmpty) return 1;
				if (bEmpty && !aEmpty) return -1;
				return ta.localeCompare(tb, 'de', {sensitivity: 'base'});
			});

			keys.forEach((k) => {
				const tr = document.createElement('tr');
				const tdLetter = document.createElement('td');
				const raw = String(k);
				tdLetter.textContent = raw.trim() === '' ? '""' : raw;

				const tdCount = document.createElement('td');
				tdCount.textContent = String(pos.counts[k]);

				const tdProb = document.createElement('td');
				const prob = pos.probabilities[k] || 0;
				tdProb.textContent = (prob * 100).toFixed(2);

				tr.appendChild(tdLetter);
				tr.appendChild(tdCount);
				tr.appendChild(tdProb);
				tbody.appendChild(tr);
			});

			table.appendChild(tbody);
			block.appendChild(table);
		});

		container.appendChild(block);
	}

	if (typeof window !== 'undefined') {
		window.calculateProbabilities = calculateProbabilities;
		window.displayProbabilities = displayProbabilities;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {calculateProbabilities, displayProbabilities};
	}
})();
