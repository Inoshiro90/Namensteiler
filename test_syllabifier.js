const fs = require('fs');
const vm = require('vm');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'syllableTokenizer.js'), 'utf8');

// Minimal DOM stub for functions that reference document when present
const sandbox = {
  console,
  module: {},
  require,
  window: {},
  document: { getElementById: () => ({ value: '' }) },
  setTimeout,
};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.SyllableTokenizer = (typeof SyllableTokenizer !== "undefined") ? SyllableTokenizer : undefined;', sandbox);

const SONORITY_HIERARCHY = [
  ['a', 'e', 'o', 'ä', 'ö', 'ü'],
  ['i', 'u', 'y'],
  ['j', 'w'],
  ['l', 'r'],
  ['m', 'n', 'ng'],
  ['v', 'f', 's', 'z', 'h', 'ch', 'sch', 'th', 'ph'],
  ['pf', 'ts', 'tz', 'tsch', 'dz'],
  ['b', 'p', 'd', 't', 'g', 'k', 'c', 'ck', 'q'],
];

const vowels = ['a','e','i','o','u','y','ä','ö','ü','ie','ei','au','eu','ou','äu'];
const allowedOnsets = [
  'b','br','bl','d','dr','f','fr','fl','g','gr','gl','k','kr','kl','p','ph','pr','pl','pf','t','tr','tsch','s','st','sp','sch','ch','m','n','l','r','w','h'
];

const tokenizer = new sandbox.SyllableTokenizer(SONORITY_HIERARCHY, vowels);
const profile = { vowels, allowedOnsets };

const names = [
  'Achim','Adrian','Allan','Alois','Andreas','Antonius','Augustin','Balthasar','Bastian','Benjamin','Benno','Björn','Christian','Christopher','Cornelius','Daniel','Leo','Ian','Joachim','Michael','Noah','Raoul','Otto','Allan','Dennis','Hannes','Yannick','Tristan','Friedrich','Gottfried','Thorsten','Raphael','Björn','Jörg','Yves'
];

for (const n of names) {
  try {
    // Debug for Achim
    if (n === 'Achim' || n === 'Joachim' || n === 'Gottfried' || n === 'Augustin' || n === 'Yves') {
      const g = sandbox.tokenizeGraphemes(n.toLowerCase(), tokenizer.graphemes);
      const vals = tokenizer.assignValues(g);
      let s = [];
      let syl = vals[0][0];
      for (let i = 0; i < vals.length - 2; i++) {
        const [, pv] = vals[i];
        const [fp, fv] = vals[i + 1];
        const [, nv] = vals[i + 2];
        if (pv > fv && fv < nv) {
          s.push(syl);
          syl = fp;
        } else {
          syl += fp;
        }
      }
      syl += vals.at(-1)[0];
      s.push(syl);
      console.log('DEBUG', n, 'tokens ->', g, 'initial SSP ->', s);
      if (n === 'Augustin') {
        console.log('DEBUG afterHiatus ->', sandbox.applyHiatusSplitting(s, tokenizer.graphemes, profile));
      }
      if (n === 'Yves') {
        let cur = s.slice();
        console.log(' -> afterHiatus', sandbox.applyHiatusSplitting(cur, tokenizer.graphemes, profile));
        cur = sandbox.applyHiatusSplitting(cur, tokenizer.graphemes, profile);
        console.log(' -> afterMergeInit', sandbox.mergeInitialSemivowelSyllable(cur.slice(), profile));
        cur = sandbox.mergeInitialSemivowelSyllable(cur.slice(), profile);
        console.log(' -> afterGemination', sandbox.applyGeminationSplitting(cur.slice(), tokenizer.graphemes, profile));
        cur = sandbox.applyGeminationSplitting(cur.slice(), tokenizer.graphemes, profile);
        console.log(' -> afterMultiNuclei', sandbox.applySplitMultipleNuclei(cur.slice(), tokenizer.graphemes, profile));
        cur = sandbox.applySplitMultipleNuclei(cur.slice(), tokenizer.graphemes, profile);
        console.log(' -> afterLatinSuffix', sandbox.applyLatinSuffixSplits(cur.slice()));
        cur = sandbox.applyLatinSuffixSplits(cur.slice());
        console.log(' -> afterMergeConsonantOnly', sandbox.mergeConsonantOnlySyllables(cur.slice(), profile));
        cur = sandbox.mergeConsonantOnlySyllables(cur.slice(), profile);
        console.log(' -> afterOMR', sandbox.applyOnsetMaximization(cur.slice(), profile));
      }
    }

    const out = tokenizer.tokenize(n, profile);
    console.log(n.padEnd(12), '→', out.join('-'));
  } catch (e) {
    console.error('ERROR on', n, e);
  }
}
