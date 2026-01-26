(function () {
    function calculateCVPatternsPerLength(nameArray) {
        if (!Array.isArray(nameArray)) return [];
        const vowels = (typeof window !== 'undefined' && typeof window.getVowelSet === 'function')
            ? window.getVowelSet()
            : new Set(['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y']);
        const isLetterRe = /^[a-zäöüß]$/i;

        const groups = {};

        nameArray.forEach((rawName) => {
            const s = typeof rawName === 'string' ? rawName.trim() : '';
            if (s.length === 0) return;
            const chars = [...s];
            const pattern = chars
                .map((ch) => {
                    const k = String(ch).toLowerCase();
                    if (!isLetterRe.test(k)) return 'C';
                    return vowels.has(k) ? 'V' : 'C';
                })
                .join('');
            const len = chars.length;
            if (!groups[len]) groups[len] = { total: 0, counts: {} };
            groups[len].total += 1;
            groups[len].counts[pattern] = (groups[len].counts[pattern] || 0) + 1;
        });

        const result = Object.keys(groups).map((k) => {
            const len = Number(k);
            const total = groups[k].total;
            const counts = groups[k].counts;
            const probs = {};
            Object.keys(counts).forEach((pat) => {
                probs[pat] = counts[pat] / total;
            });
            return { length: len, total, counts, probabilities: probs };
        });

        result.sort((a, b) => a.length - b.length);
        return result;
    }

    function displayCVPatternsPerLength(cvDist, containerId = 'results') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const header = document.createElement('h3');
        header.textContent = 'C/V-Kombinationen pro Namenslänge';
        container.appendChild(header);

        if (!Array.isArray(cvDist) || cvDist.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'Keine Daten.';
            container.appendChild(p);
            return;
        }

        const sortedCvDist = Array.isArray(cvDist)
            ? cvDist.slice().sort((a, b) => a.length - b.length)
            : [];
        const out = {};

        sortedCvDist.forEach((item) => {
            const h4 = document.createElement('h4');
            h4.textContent = `Länge ${item.length} (Anzahl Namen: ${item.total})`;
            container.appendChild(h4);

            const table = document.createElement('table');
            table.className = 'table table-sm table-bordered';
            const thead = document.createElement('thead');
            thead.innerHTML =
                '<tr><th>Muster</th><th>Anzahl</th><th>Wahrscheinlichkeit in Prozent</th></tr>';
            table.appendChild(thead);
            const tbody = document.createElement('tbody');

            const patterns = Object.keys(item.counts || {});
            patterns.sort((a, b) => (item.counts[b] || 0) - (item.counts[a] || 0));

            const patternEntries = patterns.map((pat) => [pat, item.counts[pat], item.probabilities[pat] || 0]);

            patternEntries.forEach(([pat, cnt, prob]) => {
                const tr = document.createElement('tr');
                const tdM = document.createElement('td');
                tdM.textContent = pat;
                const tdC = document.createElement('td');
                tdC.textContent = String(cnt);
                const tdP = document.createElement('td');
                tdP.textContent = (prob * 100).toFixed(2).replace('.', ',');
                tr.appendChild(tdM);
                tr.appendChild(tdC);
                tr.appendChild(tdP);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            container.appendChild(table);

            const probabilitiesObj = Object.fromEntries(
                patternEntries.map(([pat, cnt, prob]) => [pat, (prob * 100).toFixed(2)])
            );
            out[item.length] = probabilitiesObj;
        });

        if (Object.keys(out).length > 0) {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'btn btn-sm btn-secondary  mb-2';
            copyBtn.textContent = 'C/V Object Array kopieren';
            copyBtn.setAttribute('aria-label', 'Kopiere C/V-Muster per Länge als JSON');

            const outJson = JSON.stringify(out, null, 2);
            copyBtn.addEventListener('click', async () => {
                try {
                    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                        await navigator.clipboard.writeText(outJson);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = outJson;
                        ta.setAttribute('readonly', '');
                        ta.style.position = 'absolute';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                    const old = copyBtn.textContent;
                    copyBtn.textContent = 'Kopiert!';
                    copyBtn.disabled = true;
                    setTimeout(() => {
                        copyBtn.textContent = old;
                        copyBtn.disabled = false;
                    }, 1500);
                } catch (err) {
                    console.error('Kopieren fehlgeschlagen', err);
                    copyBtn.textContent = 'Fehler';
                    setTimeout(() => {
                        copyBtn.textContent = 'C/V Object Array kopieren';
                    }, 1500);
                }
            });

            container.appendChild(copyBtn);
            const pre = document.createElement('pre');
            pre.textContent = outJson;
            container.appendChild(pre);
        }
    }

    if (typeof window !== 'undefined') {
        window.calculateCVPatternsPerLength = calculateCVPatternsPerLength;
        window.displayCVPatternsPerLength = displayCVPatternsPerLength;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { calculateCVPatternsPerLength, displayCVPatternsPerLength };
    }
})();
