export type Complex = [number, number];
export const complex = (re: number, im: number): Complex => [re, im];
export const add = (a: Complex, b: Complex): Complex => [
  a[0] + b[0],
  a[1] + b[1],
];
export const sub = (a: Complex, b: Complex): Complex => [
  a[0] - b[0],
  a[1] - b[1],
];
export const mult = (a: Complex, b: Complex): Complex => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
export const eix = (x: number): Complex => [Math.cos(x), Math.sin(x)];
export const abs = (v: Complex) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
export const scale = (v: Complex, s: number): Complex => [v[0] * s, v[1] * s];
export const re = (v: Complex) => v[0];
export const im = (v: Complex) => v[1];