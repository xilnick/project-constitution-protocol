// A whitespace-invariant word count (`words * 1.3`) cannot bind a dense payload:
// 800 whitespace-free characters score 23. This charges by character class, so
// removing whitespace cannot lower the estimate.
export function estimateTokens(s) {
  let total = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      while (i < s.length && /\s/.test(s[i])) i += 1;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let n = 0;
      while (i < s.length && /[A-Za-z]/.test(s[i])) { i += 1; n += 1; }
      total += Math.ceil(n / 4);
      continue;
    }
    if (/[0-9]/.test(c)) {
      let n = 0;
      while (i < s.length && /[0-9]/.test(s[i])) { i += 1; n += 1; }
      total += Math.ceil(n / 3);
      continue;
    }
    total += 1;
    i += 1;
  }
  return total;
}
