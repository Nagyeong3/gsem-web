/** Match the existing case-insensitive contains search and bound the number of
 * rendered suggestions, not the number of rows returned by the table query. */
export function matchingSearchOptions(options: string[], input: string, limit = 100): string[] {
  const needle = input.trim().toLocaleLowerCase();
  return options.filter(option => option.toLocaleLowerCase().includes(needle)).slice(0, limit);
}
