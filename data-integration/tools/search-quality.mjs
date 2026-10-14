// Offline audit of every published SNIES name and deterministic typo variants.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { careerWords, literalCareerMatch, fuzzyCareerMatch } from '../dist/utils/career-search.js';
import { selectPrograms } from '../dist/services/program-catalog.js';

const index = JSON.parse(readFileSync(new URL('../data/snies-program-names.json', import.meta.url)));
const vocabulary = new Set(index.records.flatMap(row => [...careerWords(row[2]), ...careerWords(row[3])]));
const report = { source: index.source, importedAt: index.importedAt, records: index.records.length, vocabulary: vocabulary.size, exactNames: 0, normalizedNames: 0, filterChecks: 0, recognizedPrefixPairs: 0, incompleteWordPrefixes: 0, closeWordPairs: 0, typoVariants: 0, ambiguousTyposSkipped: 0, shortTyposRejected: 0 };

for (const [i, record] of index.records.entries()) {
  const [code,institutionCode,name,awardedTitle,academicLevel,modality,municipality] = record;
  const program = { sourceId:`upr9-nkiz:audit-${i}`,code,sniesCode:code,institutionCode,name,awardedTitle,academicLevel,modality,municipality,institutionName:'Institución de prueba',knowledgeArea:'',broadKnowledgeArea:'',department:'',educationLevel:'',periodCount:'',periodicity:'',status:'',nameOrigin:'SNIES_NAME',reviewRequired:false };
  const filters = { name, page:1, limit:12 };
  assert.equal(selectPrograms([program],filters).length,1,`Exact name lost: ${name}`); report.exactNames++;
  const normalized=name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ');
  assert.equal(selectPrograms([program],{...filters,name:normalized}).length,1,`Normalized name lost: ${name}`); report.normalizedNames++;
  for (const [key,value] of Object.entries({institutionCode,academicLevel,modality,municipality})) {
    assert.equal(selectPrograms([program],{...filters,[key]:value}).length,1,`Own filter rejected: ${name}/${key}`);
    assert.equal(selectPrograms([program],{...filters,[key]:'NO_COINCIDE_AUDITORIA'}).length,0,`Filter ignored: ${name}/${key}`);
    report.filterChecks+=2;
  }
}

// Exhaust every recognized proper prefix, including words embedded inside
// longer words. They may not be interpreted as autocomplete fragments.
for (const word of vocabulary) for (let end=1;end<word.length;end++) {
  const prefix=word.slice(0,end);
  const prefixTokens=careerWords(prefix);
  if(end>=2 && prefixTokens.length===1 && prefixTokens[0]===prefix && !vocabulary.has(prefix)) {
    assert(literalCareerMatch(prefix,word,vocabulary,true),`Incomplete prefix lost: ${prefix}/${word}`);
    report.incompleteWordPrefixes++;
  }
  if (!vocabulary.has(prefix)) continue;
  assert.equal(literalCareerMatch(prefix,word,vocabulary,true),false,`${prefix} leaked into ${word}`);
  report.recognizedPrefixPairs++;
}

// Shared deletion signatures expose near-spelling collisions in linear space,
// rather than comparing every word against every other word.
const signatures=new Map();
for (const word of vocabulary) {
  const edits=new Set([word]);
  if(word.length>=5) for(let i=0;i<word.length;i++) edits.add(word.slice(0,i)+word.slice(i+1));
  for(const signature of edits) {
    const neighbors=signatures.get(signature)||[];
    for(const neighbor of neighbors) {
      if(neighbor===word)continue;
      assert.equal(fuzzyCareerMatch([word],neighbor,vocabulary),false,`${word} drifted into ${neighbor}`);
      assert.equal(fuzzyCareerMatch([neighbor],word,vocabulary),false,`${neighbor} drifted into ${word}`);
      report.closeWordPairs++;
    }
    neighbors.push(word);signatures.set(signature,neighbors);
  }
}

// Every eligible word: one omitted character and every adjacent transposition.
// Known resulting words are intentionally not treated as typing mistakes.
for(const word of vocabulary) {
  if(word.length<5)continue;
  const edits=new Set();
  for(let i=0;i<word.length;i++) {
    edits.add(word.slice(0,i)+word.slice(i+1));
    if(i+1<word.length)edits.add(word.slice(0,i)+word[i+1]+word[i]+word.slice(i+2));
  }
  for(const typo of edits) {
    // Removing a connector can leave no meaningful search token.
    const tokens=careerWords(typo);
    if(!tokens.length)continue;
    if(tokens.every(token=>vocabulary.has(token))) {report.ambiguousTyposSkipped++;continue;}
    if(tokens.some(token=>token.length<5)) {
      assert.equal(fuzzyCareerMatch(tokens,word,vocabulary),false);
      report.shortTyposRejected++;continue;
    }
    assert.equal(fuzzyCareerMatch(tokens,word,vocabulary),true,`Typo lost: ${typo}/${word}`);
    report.typoVariants++;
  }
}
console.log(JSON.stringify(report,null,2));
