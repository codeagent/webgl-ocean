import { abs, areAqual, complex, Complex, sub } from '../fft/fft';

export function areCloseEnough(
  a: Complex[],
  b: Complex[],
  eps: number = 1.0e-4
): boolean {
  return a.every((v, i) => areAqual(v, b[i], eps));
}

export function getDiff(a: Complex[], b: Complex[], len = 10): number[] {
  return a
    .map((v, i) => abs(sub(v, b[i])))
    .sort((a, b) => b - a)
    .slice(0, len);
}

export function random(range: number = 1): number {
  return 2 * Math.random() * range - range;
}

export function float4ToComplex2d(
  data: Float32Array,
  size: number,
  offset: number = 0
): Complex[][] {
  const result = [];
  for (let i = 0; i < size; i++) {
    const row: Complex[] = [];
    for (let j = 0; j < size; j++) {
      const re = data[(i * size + j) * 4 + offset];
      const im = data[(i * size + j) * 4 + 1 + offset];
      row.push(complex(re, im));
    }
    result.push(row);
  }
  return result;
}

export function float4Random(size: number, range: number = 1): Float32Array {
  const buffer = new Float32Array(size * 4);

  for (let i = 0; i < size; i++) {
    buffer[i] = random(range);
  }

  return buffer;
}
