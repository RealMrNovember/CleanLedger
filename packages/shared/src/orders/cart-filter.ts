import { resolveColorDisplay, type ProductColorPreset } from "../colors/product-palette";

/** POS sepet satırını renk etiketi veya hex ile filtreler. */
export function cartLineMatchesColorQuery(
  color: string | null | undefined,
  query: string,
  palette: ProductColorPreset[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (!color) return false;
  const display = resolveColorDisplay(palette, color);
  if (display?.label.toLowerCase().includes(q)) return true;
  return color.toLowerCase().includes(q);
}
