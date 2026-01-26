// function displayMorphemesTable(morphemes, containerId) {
// 	const container = document.getElementById(containerId);
// 	if (!container || !morphemes) return;

// 	['prefix', 'infix', 'suffix'].forEach((pos) => {
// 		const posData = morphemes[pos];
// 		if (!posData || Object.keys(posData).length === 0) return;

// 		const h4 = document.createElement('h4');
// 		h4.textContent = pos.charAt(0).toUpperCase() + pos.slice(1);
// 		container.appendChild(h4);

// 		Object.keys(posData)
// 			.sort((a, b) => Number(a) - Number(b))
// 			.forEach((len) => {
// 				const morphemesOfLen = posData[len];
// 				if (!morphemesOfLen || Object.keys(morphemesOfLen).length === 0) return;

// 				const h5 = document.createElement('h5');
// 				h5.textContent = `Länge ${len}`;
// 				container.appendChild(h5);

// 				const table = document.createElement('table');
// 				table.className = 'table table-sm table-bordered';

// 				const thead = document.createElement('thead');
// 				thead.innerHTML = `
// 					<tr>
// 						<th>Morphem</th>
// 						<th>CV-Muster</th>
// 						<th>Anzahl</th>
// 						<th>Wahrscheinlichkeit gesamt (%)</th>
// 						<th>Wahrscheinlichkeit (Länge) (%)</th>
// 					</tr>
// 				`;
// 				table.appendChild(thead);

// 				const tbody = document.createElement('tbody');

// 				Object.entries(morphemesOfLen)
// 					.sort((a, b) => b[1].probOverall - a[1].probOverall)
// 					.forEach(([morpheme, data]) => {
// 						const tr = document.createElement('tr');

// 						const tdM = document.createElement('td');
// 						tdM.textContent = morpheme;

// 						const tdPattern = document.createElement('td');
// 						tdPattern.textContent = data.pattern || '';

// 						const tdCount = document.createElement('td');
// 						tdCount.textContent = data.count;

// 						const tdPO = document.createElement('td');
// 						tdPO.textContent = data.probOverall.toFixed(2);

// 						const tdPL = document.createElement('td');
// 						tdPL.textContent = data.probByLength.toFixed(2);

// 						tr.appendChild(tdM);
// 						tr.appendChild(tdPattern);
// 						tr.appendChild(tdCount);
// 						tr.appendChild(tdPO);
// 						tr.appendChild(tdPL);

// 						tbody.appendChild(tr);
// 					});

// 				table.appendChild(tbody);
// 				container.appendChild(table);
// 			});
// 	});
// }

// 
function displayMorphemesTable(morphemes, containerId) {
	const container = document.getElementById(containerId);
	if (!container || !morphemes) return;

	const categoryNames = {
		prefix: 'Präfix',
		infix: 'Infix',
		suffix: 'Suffix'
	};

	['prefix', 'infix', 'suffix'].forEach(pos => {
		const posData = morphemes[pos];
		if (!posData || Object.keys(posData).length === 0) return;

		const h4 = document.createElement('h4');
		h4.textContent = categoryNames[pos] || pos;
		container.appendChild(h4);

		const table = document.createElement('table');
		table.className = 'table table-sm table-bordered';

		const thead = document.createElement('thead');
		thead.innerHTML = `
			<tr>
				<th>Morphem</th>
				<th>Länge</th>
				<th>CV-Muster</th>
				<th>Gesamt in Prozent</th>
				<th>Pro Länge in Prozent</th>
				<th>Anzahl</th>
			</tr>
		`;
		table.appendChild(thead);

		const tbody = document.createElement('tbody');

		Object.keys(posData)
			.sort((a, b) => Number(a) - Number(b))
			.forEach(len => {
				const morphemesOfLen = posData[len];
				if (!morphemesOfLen || Object.keys(morphemesOfLen).length === 0) return;

				Object.entries(morphemesOfLen)
					.sort((a, b) => b[1].probOverall - a[1].probOverall)
					.forEach(([morpheme, data]) => {
						const tr = document.createElement('tr');

						const tdM = document.createElement('td');
						tdM.textContent = morpheme;

						const tdLen = document.createElement('td');
						tdLen.textContent = len;

						const tdPattern = document.createElement('td');
						tdPattern.textContent = data.pattern || '';

						const tdPO = document.createElement('td');
						tdPO.textContent = data.probOverall.toFixed(2).replace('.', ',');

						const tdPL = document.createElement('td');
						tdPL.textContent = data.probByLength.toFixed(2).replace('.', ',');

						const tdCount = document.createElement('td');
						tdCount.textContent = data.count;

						tr.appendChild(tdM);
						tr.appendChild(tdLen);
						tr.appendChild(tdPattern);
						tr.appendChild(tdPO);
						tr.appendChild(tdPL);
						tr.appendChild(tdCount);

						tbody.appendChild(tr);
					});
			});

		table.appendChild(tbody);
		container.appendChild(table);
	});
}
