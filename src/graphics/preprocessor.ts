export function preprocess(
  src: string,
  defines: Record<string, number>
): string {
  for (const name in defines) {
    src = src.replace(
      new RegExp(`#define ${name} \\d+`),
      `#define ${name} ${defines[name]}`
    );
  }

  return src;
}
