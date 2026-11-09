export interface Box { width: number; height: number }
export interface Row<T> { items: { item: T; width: number }[]; height: number }

/**
 * Justified rows: every photo keeps its aspect ratio, rows fill the container width exactly,
 * and the last row keeps the target height instead of being blown up.
 */
export function justify<T extends Box>(items: T[], containerWidth: number, targetHeight: number, gap: number): Row<T>[] {
  const rows: Row<T>[] = [];
  let row: T[] = [];
  let ratioSum = 0;
  for (const item of items) {
    row.push(item);
    ratioSum += item.width / item.height;
    const naturalWidth = ratioSum * targetHeight + gap * (row.length - 1);
    if (naturalWidth >= containerWidth) {
      const height = (containerWidth - gap * (row.length - 1)) / ratioSum;
      rows.push({ height, items: row.map((it) => ({ item: it, width: (it.width / it.height) * height })) });
      row = [];
      ratioSum = 0;
    }
  }
  if (row.length) {
    const height = Math.min(targetHeight, (containerWidth - gap * (row.length - 1)) / ratioSum);
    rows.push({ height, items: row.map((it) => ({ item: it, width: (it.width / it.height) * height })) });
  }
  return rows;
}
