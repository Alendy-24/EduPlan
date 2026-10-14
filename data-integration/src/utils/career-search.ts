export const normalizeCareerText = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
const connectors = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN', 'A', 'AL', 'PARA']);
export function careerWords(text: string): string[] {
  return [...new Set(normalizeCareerText(text).replace(/INGENIERO\(A\)/g, 'INGENIERIA')
    .replace(/\bINGENIER[OA]\b/g, 'INGENIERIA').split(/[^A-Z0-9]+/)
    .filter(word => word && !connectors.has(word)))];
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

export function fuzzyCareerMatch(queryWords: string[], candidate: string): boolean {
  const words = careerWords(candidate);
  return queryWords.length > 0 && queryWords.every(query => words.some(word => similarCareerWord(query, word)));
}
