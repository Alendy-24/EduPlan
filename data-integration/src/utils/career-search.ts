export const normalizeCareerText = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
const connectors = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN', 'A', 'AL', 'PARA']);
export function careerWords(text: string): string[] {
  return [...new Set(normalizeCareerText(text).replace(/INGENIERO\(A\)/g, 'INGENIERIA')
    .replace(/\bINGENIER[OA]\b/g, 'INGENIERIA').split(/[^A-Z0-9]+/)
    .filter(word => word && !connectors.has(word)))];
}

// Match complete tokens. Autocomplete may complete the last token only, and
// must never reinterpret a recognized word as the prefix of another word.
export function literalCareerMatch(query: string, candidate: string, knownWords: ReadonlySet<string> = new Set(), allowPrefix = false): boolean {
  const left = careerWords(query), right = careerWords(candidate);
  return left.length > 0 && left.every((word, index) => right.includes(word)
    || allowPrefix && index === left.length - 1 && word.length >= 2
      && (!knownWords.has(word) || word.length === 2 && left.length > 1)
      && right.some(value => value.startsWith(word)));
}

export function relatedCareerMatch(query: string, candidate: string): boolean {
  const left = careerWords(query), right = careerWords(candidate);
  if (!left.length || !right.length) return false;
  // Expanded names can match shorter academic names, but a single generic
  // candidate word cannot discard the specialty requested by the user.
  const generic = new Set(['INGENIERIA','MAESTRIA','MAGISTER','ESPECIALIZACION','ESPECIALISTA','DOCTORADO','DOCTOR','TECNOLOGIA','TECNOLOGO','TECNICO','TECNICA','PROFESIONAL','CIENCIAS','ESTUDIOS','LICENCIATURA']);
  return left.every(word => right.includes(word)) || right.length >= 2 && right.some(word => !generic.has(word)) && right.every(word => left.includes(word));
}

// Bounded Damerau-Levenshtein distance also handles adjacent swapped letters.
// Short words require an exact match to avoid suggesting unrelated disciplines.
export function similarCareerWord(query: string, word: string): boolean {
  if (query === word) return true;
  const limit = query.length >= 8 ? 2 : query.length >= 5 ? 1 : 0;
  if (!limit || Math.abs(query.length - word.length) > limit) return false;
  let previous = Array.from({ length: word.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let i = 1; i <= query.length; i++) {
    const current = [i];
    for (let j = 1; j <= word.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(query[i - 1] !== word[j - 1]));
      if (i > 1 && j > 1 && query[i - 1] === word[j - 2] && query[i - 2] === word[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
    }
    beforePrevious = previous; previous = current;
  }
  return previous[word.length] <= limit;
}

export function fuzzyCareerMatch(queryWords: string[], candidate: string, knownWords: ReadonlySet<string> = new Set(), lockedWords: ReadonlySet<string> = knownWords): boolean {
  const words = careerWords(candidate);
  // A fully recognized query must not drift into different catalog words.
  // If any word is unknown, preserve correction of multiword typos. The
  // published catalog itself contains occasional misspellings in names.
  const recognizedQuery = queryWords.every(query => knownWords.has(query));
  return queryWords.length > 0 && queryWords.every(query => words.some(word =>
    query === word || !recognizedQuery && !lockedWords.has(query) && similarCareerWord(query, word)));
}
