export interface ProductColorPreset {
  label: string;
  hex: string;
}

export const DEFAULT_PRODUCT_COLOR_PALETTE: ProductColorPreset[] = [
  { label: "Siyah", hex: "#1a1a1a" },
  { label: "Beyaz", hex: "#f5f5f5" },
  { label: "Lacivert", hex: "#1e3a5f" },
  { label: "Gri", hex: "#6b7280" },
  { label: "Kırmızı", hex: "#dc2626" },
  { label: "Haki", hex: "#6b705c" },
  { label: "Kahverengi", hex: "#78350f" },
  { label: "Bej", hex: "#d4c4a8" },
  { label: "Mavi", hex: "#2563eb" },
  { label: "Yeşil", hex: "#16a34a" },
];

export function cloneDefaultProductColorPalette(): ProductColorPreset[] {
  return DEFAULT_PRODUCT_COLOR_PALETTE.map((p) => ({ ...p }));
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed;
  return `#${trimmed}`;
}

export function findPresetByValue(
  palette: ProductColorPreset[],
  value: string | null | undefined
): ProductColorPreset | undefined {
  if (!value) return undefined;
  const normalized = normalizeHexColor(value);
  const lower = value.trim().toLowerCase();
  return palette.find(
    (p) =>
      p.hex.toLowerCase() === normalized ||
      p.hex.toLowerCase() === lower ||
      p.label.toLowerCase() === lower
  );
}

export function resolveColorDisplay(
  palette: ProductColorPreset[],
  value: string | null | undefined
): ProductColorPreset | null {
  if (!value) return null;
  const preset = findPresetByValue(palette, value);
  if (preset) return preset;
  const hex = normalizeHexColor(value);
  if (!hex) return null;
  return { label: hex, hex };
}

export function summarizeOrderItemColors(
  colors: Array<string | null | undefined>,
  palette: ProductColorPreset[]
): Array<{ label: string; hex: string }> {
  const seen = new Set<string>();
  const result: Array<{ label: string; hex: string }> = [];
  for (const raw of colors) {
    if (!raw) continue;
    const display = resolveColorDisplay(palette, raw);
    if (!display) continue;
    const key = display.hex.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(display);
  }
  return result;
}

export function colorMatchesSearch(
  palette: ProductColorPreset[],
  colorValue: string | null | undefined,
  query: string
): boolean {
  if (!colorValue) return false;
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const display = resolveColorDisplay(palette, colorValue);
  if (!display) return false;
  if (display.label.toLowerCase().includes(q)) return true;
  if (display.hex.toLowerCase().includes(q)) return true;
  if (normalizeHexColor(q) && display.hex.toLowerCase().includes(normalizeHexColor(q))) {
    return true;
  }
  return false;
}
