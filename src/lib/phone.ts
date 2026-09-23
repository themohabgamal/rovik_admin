/** Match DB function public.normalize_egypt_phone → +20XXXXXXXXXX */
export function normalizeEgPhone(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10 || !digits.startsWith("1")) return null;
  return `+20${digits}`;
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined
) {
  const left = normalizeEgPhone(a);
  const right = normalizeEgPhone(b);
  if (!left || !right) return false;
  return left === right;
}

/** Display +201012345678 as 01012345678 */
export function formatPhoneDisplay(normalized: string) {
  if (normalized.startsWith("+20") && normalized.length === 13) {
    return `0${normalized.slice(3)}`;
  }
  if (normalized.startsWith("20") && normalized.length === 12) {
    return `0${normalized.slice(2)}`;
  }
  return normalized;
}
