import { vec4 } from 'gl-matrix';

/// #region complex
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
export const conj = (v: Complex): Complex => [v[0], -v[1]];
export const re = (v: Complex) => v[0];
export const im = (v: Complex) => v[1];
export const areAqual = (a: Complex, b: Complex, eps = 1.0e-4) =>
  Math.abs(re(a) - re(b)) <= eps && Math.abs(im(a) - im(b)) <= eps;
export const copy = (out: Complex, src: Complex) => (
  (out[0] = src[0]), (out[1] = src[1])
);

/// #endregion

function reverseBits(num: number, w: number): number {
  return parseInt(
    num.toString(2).padStart(w, '0').split('').reverse().join(''),
    2
  );
}

/**
 * log2(size) x size
 */
export function createButterflyTexture(
  size: number,
  inverseFft = false
): Float32Array {
  const w = Math.log2(size);
  const h = size;
  const indices = Array.from(new Array(size), (_, index) =>
    reverseBits(index, w)
  );
  const texture = new Float32Array(w * h * 4);
  const pi2 = inverseFft ? 2 * Math.PI : -2 * Math.PI;

  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const texel = vec4.create();
      const n = 1 << (j + 1);
      const k = i % n;
      const n2 = n >> 1;
      const wk = eix((pi2 * k) / n);

      if (n == 2) {
        if (k < 1) {
          vec4.set(texel, re(wk), im(wk), indices[i], indices[i + 1]);
        } else {
          vec4.set(texel, re(wk), im(wk), indices[i - 1], indices[i]);
        }
      } else {
        if (k < n2) {
          vec4.set(texel, re(wk), im(wk), i, i + n2);
        } else {
          vec4.set(texel, re(wk), im(wk), i - n2, i);
        }
      }

      texture[(w * i + j) * 4] = texel[0];
      texture[(w * i + j) * 4 + 1] = texel[1];
      texture[(w * i + j) * 4 + 2] = texel[2];
      texture[(w * i + j) * 4 + 3] = texel[3];
    }
  }

  return texture;
}

/**
 * Fast Fourier Transform
 */
export function fft(signal: Complex[]): Complex[] {
  if (signal.length == 1) {
    return signal;
  } else {
    const n = signal.length;
    const n2 = n / 2;
    const even = new Array<Complex>(n2);
    const odd = new Array<Complex>(n2);
    for (let i = 0, e = 0, o = 0; i < n; i++) {
      if (i % 2 === 0) {
        even[e++] = signal[i];
      } else {
        odd[o++] = signal[i];
      }
    }

    const evenFft = fft(even);
    const oddFft = fft(odd);
    const fhat = new Array<Complex>(n);
    const coeff = (-2 * Math.PI) / n;
    for (let k = 0; k < n; k++) {
      fhat[k] = scale(
        add(evenFft[k % n2], mult(oddFft[k % n2], eix(coeff * k))),
        0.5
      );
    }
    return fhat;
  }
}

export function ifft(fourier: Complex[]): Complex[] {
  if (fourier.length == 1) {
    return fourier;
  } else {
    const n = fourier.length;
    const n2 = n / 2;
    const even = new Array<Complex>(n2);
    const odd = new Array<Complex>(n2);
    for (let i = 0, e = 0, o = 0; i < n; i++) {
      if (i % 2 === 0) {
        even[e++] = fourier[i];
      } else {
        odd[o++] = fourier[i];
      }
    }

    const evenFft = ifft(even);
    const oddFft = ifft(odd);
    const fhat = new Array<Complex>(n);
    const coeff = (2 * Math.PI) / n;

    for (let k = 0; k < n; k++) {
      fhat[k] = add(evenFft[k % n2], mult(oddFft[k % n2], eix(coeff * k)));
    }

    return fhat;
  }
}

export function fft2(signal: Complex[][], centered = false): Complex[][] {
  const n = signal.length;
  const m = signal?.[0].length;

  const fourier: Complex[][] = [];

  // Horizontal DFT
  for (let i = 0; i < m; i++) {
    fourier.push(fft(signal[i]));
  }

  // Vertical DFT
  const col = new Array<Complex>(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = [fourier[i][j][0], fourier[i][j][1]];
    }
    const f = fft(col);

    for (let i = 0; i < m; i++) {
      fourier[i][j] = f[i];
    }
  }

  if (centered) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        fourier[i][j] = scale(fourier[i][j], [1, -1][(i + j) % 2]);
      }
    }
  }

  return fourier;
}

export function ifft2(fourier: Complex[][], centered = false): Complex[][] {
  const n = fourier.length;
  const m = fourier?.[0].length;
  const signal: Complex[][] = [...Array(m).keys()].map(() => []);

  // Vertical IDFT
  const col = new Array<Complex>(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = ifft(col);

    for (let i = 0; i < m; i++) {
      signal[i].push(f[i]);
    }
  }

  // Horizontal IDFT
  for (let i = 0; i < m; i++) {
    signal[i] = ifft(signal[i]);
  }

  if (centered) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        signal[i][j] = scale(signal[i][j], [1, -1][(i + j) % 2]);
      }
    }
  }

  return signal;
}

export function fft2Butterfly(
  transform: Complex[][],
  signal: Complex[][],
  butterfly: Float32Array
): void {
  let buffer = [signal, transform];
  let bufferIndex = 0;
  const size = signal.length;
  const stages = Math.trunc(Math.log2(size));

  // horizontal fft
  for (let stage = 0; stage < stages; stage++) {
    const src = buffer[bufferIndex];
    const dst = buffer[(bufferIndex + 1) % 2];

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const offset = (stages * j + stage) * 4;
        const [re, im, first, second] = [
          butterfly[offset],
          butterfly[offset + 1],
          Math.trunc(butterfly[offset + 2]),
          Math.trunc(butterfly[offset + 3]),
        ];
        dst[i][j] = scale(
          add(src[i][first], mult(src[i][second], complex(re, im))),
          0.5
        );
      }
    }

    bufferIndex = (bufferIndex + 1) % 2;
  }

  // vertical fft
  for (let stage = 0; stage < stages; stage++) {
    const src = buffer[bufferIndex];
    const dst = buffer[(bufferIndex + 1) % 2];

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const offset = (stages * i + stage) * 4;
        const [re, im, first, second] = [
          butterfly[offset],
          butterfly[offset + 1],
          Math.trunc(butterfly[offset + 2]),
          Math.trunc(butterfly[offset + 3]),
        ];
        dst[i][j] = scale(
          add(src[first][j], mult(src[second][j], complex(re, im))),
          0.5
        );
      }
    }

    bufferIndex = (bufferIndex + 1) % 2;
  }

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      copy(transform[i][j], signal[i][j]);
    }
  }
}

export function ifft2Butterfly(
  transform: Complex[][],
  fourier: Complex[][],
  butterfly: Float32Array
): void {
  let buffer = [fourier, transform];
  let bufferIndex = 0;
  const size = fourier.length;
  const stages = Math.trunc(Math.log2(size));

  // horizontal fft
  for (let stage = 0; stage < stages; stage++) {
    const src = buffer[bufferIndex];
    const dst = buffer[(bufferIndex + 1) % 2];

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const offset = (stages * j + stage) * 4;
        const [re, im, first, second] = [
          butterfly[offset],
          butterfly[offset + 1],
          Math.trunc(butterfly[offset + 2]),
          Math.trunc(butterfly[offset + 3]),
        ];
        dst[i][j] = add(src[i][first], mult(src[i][second], complex(re, im)));
      }
    }

    bufferIndex = (bufferIndex + 1) % 2;
  }

  // vertical fft
  for (let stage = 0; stage < stages; stage++) {
    const src = buffer[bufferIndex];
    const dst = buffer[(bufferIndex + 1) % 2];

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const offset = (stages * i + stage) * 4;
        const [re, im, first, second] = [
          butterfly[offset],
          butterfly[offset + 1],
          Math.trunc(butterfly[offset + 2]),
          Math.trunc(butterfly[offset + 3]),
        ];
        dst[i][j] = add(src[first][j], mult(src[second][j], complex(re, im)));
      }
    }

    bufferIndex = (bufferIndex + 1) % 2;
  }

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      copy(transform[i][j], fourier[i][j]);
    }
  }
}
