export const COVER_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#1e3a8a', '#7c3aed'],
  ['#831843', '#be185d'],
  ['#064e3b', '#10b981'],
  ['#7c2d12', '#ea580c'],
  ['#1e293b', '#0ea5e9'],
  ['#581c87', '#ec4899'],
  ['#365314', '#84cc16'],
  ['#7f1d1d', '#f59e0b'],
];

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function gradientFor(seed: string): string {
  const [a, b] = COVER_GRADIENTS[hashString(seed) % COVER_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}
