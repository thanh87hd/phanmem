// ponytail: Replaces the ~15 instances of JSON.parse(localStorage.getItem('user') || '{}')
export function useCurrentUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
