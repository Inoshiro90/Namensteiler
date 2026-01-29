(function () {
	/**
	 * Konvertiert eine HTML-Tabelle zu tabulatorsepariertem Text
	 */
	function tableToText(table) {
		const rows = [];
		const headerCells = table.querySelectorAll('thead th');
		const headers = Array.from(headerCells).map(h => h.textContent.trim());
		rows.push(headers.join('\t'));

		const bodyCells = table.querySelectorAll('tbody tr');
		bodyCells.forEach(row => {
			const cells = row.querySelectorAll('td');
			const values = Array.from(cells).map(c => c.textContent.trim());
			rows.push(values.join('\t'));
		});

		return rows.join('\n');
	}

	/**
	 * Erstellt einen Copy-Button für eine Tabelle
	 */
	function createTableCopyButton(table, label = 'Tabelle kopieren') {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'btn btn-sm btn-secondary mb-2';
		btn.textContent = label;

		btn.addEventListener('click', async () => {
			try {
				const text = tableToText(table);
				if (navigator.clipboard) {
					await navigator.clipboard.writeText(text);
					const originalText = btn.textContent;
					btn.textContent = '✓ Kopiert!';
					setTimeout(() => {
						btn.textContent = originalText;
					}, 2000);
				}
			} catch (e) {
				console.error('Kopieren fehlgeschlagen:', e);
			}
		});

		return btn;
	}

	/**
	 * Erstellt einen Copy-Button für JSON
	 */
	function createJsonCopyButton(jsonStr, label = 'JSON kopieren') {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'btn btn-sm btn-secondary mb-2';
		btn.textContent = label;

		btn.addEventListener('click', async () => {
			try {
				if (navigator.clipboard) {
					await navigator.clipboard.writeText(jsonStr);
					const originalText = btn.textContent;
					btn.textContent = '✓ Kopiert!';
					setTimeout(() => {
						btn.textContent = originalText;
					}, 2000);
				}
			} catch (e) {
				console.error('Kopieren fehlgeschlagen:', e);
			}
		});

		return btn;
	}

	if (typeof window !== 'undefined') {
		window.tableToText = tableToText;
		window.createTableCopyButton = createTableCopyButton;
		window.createJsonCopyButton = createJsonCopyButton;
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			tableToText,
			createTableCopyButton,
			createJsonCopyButton
		};
	}
})();
