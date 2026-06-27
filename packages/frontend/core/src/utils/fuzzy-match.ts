/**
 * name が query に fuzzy match するかどうかを確認します。
 *
 * @example
 * ```ts
 * const name = 'John Smith';
 * const query = 'js';
 * const isMatch = fuzzyMatch(name, query);
 * // isMatch: true
 * ```
 *
 * initialMatch = true の場合は、先頭文字も一致している必要があります。
 */
export function fuzzyMatch(
  name: string,
  query: string,
  matchInitial?: boolean
) {
  const pureName = [...name.trim().toLowerCase()]
    .filter(char => char !== ' ')
    .join('');

  const regex = new RegExp(
    [...query]
      .filter(char => char !== ' ')
      .map(item => `${escapeRegExp(item)}.*`)
      .join(''),
    'i'
  );

  if (matchInitial && query.length > 0 && !pureName.startsWith(query[0])) {
    return false;
  }

  return regex.test(pureName);
}

function escapeRegExp(input: string) {
  // regex format error を防ぐため、input string 内の regex 文字を escape します。
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
