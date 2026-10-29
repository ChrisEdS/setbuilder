/** Compare dotted versions like 4.6.4 / v4.6.4. True when remote is newer. */
export function isVersionNewer(remote: string, local: string): boolean {
  const parts = (value: string) =>
    value
      .trim()
      .replace(/^v/i, "")
      .split(/[.+-]/)
      .map((chunk) => {
        const n = Number.parseInt(chunk, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const a = parts(remote);
  const b = parts(local);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}
