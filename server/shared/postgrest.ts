export function postgrestIn(values: readonly string[]): string {
  return `in.(${values.join(",")})`;
}
