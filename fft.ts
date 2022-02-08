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

// --

/**
 * Discrete fourier transform
 */
export const dft = (signal: Float32Array): Complex[] => {
  const n = signal.length;
  const fhat = new Array<Complex>(n);
  const coeff = (-2 * Math.PI) / n;
  for (let k = 0, k1 = n; k < k1; k++) {
    fhat[k] = complex(0.0, 0.0);
    for (let j = 0; j < n; j++) {
      fhat[k] = add(fhat[k], scale(eix(coeff * k * j), signal[j]));
    }
  }
  return fhat;
};

/**
 * Fast Fourier Transform
 */
export const fft = (signal: Float32Array): Complex[] => {
  if (signal.length <= 2) {
    return dft(signal);
  } else {
    const n = signal.length;
    const n2 = n / 2;
    const even = new Float32Array(n2);
    const odd = new Float32Array(n2);
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
      fhat[k] = add(evenFft[k % n2], mult(oddFft[k % n2], eix(coeff * k)));
    }
    return fhat;
  }
};

export interface BatterflyNode {
  indices: number[];
  even?: BatterflyNode;
  odd?: BatterflyNode;
}

export const makeBatterflyTree = (indices: number[]) => {
  const node: BatterflyNode = { indices: [...indices] };

  if (indices.length > 2) {
    const n = indices.length;
    const even = new Array<number>(n / 2);
    const odd = new Array<number>(n / 2);

    for (let i = 0, e = 0, o = 0; i < n; i++) {
      if (i % 2 === 0) {
        even[e++] = indices[i];
      } else {
        odd[o++] = indices[i];
      }
    }

    node.even = makeBatterflyTree(even);
    node.odd = makeBatterflyTree(odd);
  }

  return node;
};

export type ButterflyEntry = [number, number, Complex];
export type ButterflyTier = ButterflyEntry[];

export const makeButterfly = (root: BatterflyNode): ButterflyTier[] => {
  const queue: BatterflyNode[] = [root];
  const tiers = new Array<ButterflyTier>(Math.log2(root.indices.length));

  // Breadth-first
  while (queue.length) {
    const node = queue.shift();
    const size = node.indices.length;
    const tierId = Math.log2(size) - 1;

    const w = (-2 * Math.PI) / size;
    const tier = (tiers[tierId] = tiers[tierId] ?? []);

    if (tierId === 0) {
      tier.push([node.indices[0], node.indices[1], complex(1, 0)]);
      tier.push([node.indices[0], node.indices[1], eix(w)]);
    } else {
      const offset = tier.length;

      const n2 = size / 2;

      for (let k = 0; k < size; k++) {
        tier.push([offset + (k % n2), offset + (k % n2) + n2, eix(w * k)]);
      }

      queue.push(node.even);
      queue.push(node.odd);
    }
  }

  return tiers;
};

export const testButterfly = (size: number) => {
  const signal = [...Array(size).keys()].map(() => Math.random() * 2.0 - 1.0);

  const tree = makeBatterflyTree([...Array(size).keys()]);
  const butterfly = makeButterfly(tree);

  const pingPong = [new Array<Complex>(size), new Array<Complex>(size)];
  pingPong[0] = Array.from(signal).map((v) => complex(v, 0));

  let src = 0;
  let dest = 1;

  for (let phase of butterfly) {
    for (let k = 0; k < phase.length; k++) {
      const [i, j, w] = phase[k];
      pingPong[dest][k] = add(pingPong[src][i], mult(pingPong[src][j], w));
    }

    src = dest;
    dest = (dest + 1) % 2;
  }

  // --
  const actual: Complex[] = pingPong[src];
  const expected: Complex[] = fft(Float32Array.from(signal));

  const diff = actual.map((a, i) => abs(sub(a, expected[i])));
  const closeEnougth = diff.every((v) => v <= 1.0e-5);
  if (!closeEnougth) {
    console.warn("Test don't passesd: ", diff);
  } else {
    console.log('Test passed!');
  }
};

const toImage = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((r, j) => canvas.toBlob((b) => r(b), 'image/png', 1));

const toClamped = (float: number) => Math.floor((float * 0.5 + 0.5) * 255);

export const downloadImage = async (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  document.body.appendChild(canvas);

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);

  const imageData = context.createImageData(width, height);
  imageData.data.set(data);
  context.putImageData(imageData, 0, 0);

  const blob = await toImage(canvas);
  canvas.remove();

  const img = new Image();
  img.src = URL.createObjectURL(blob);
  img.width = height;
  img.height = height;
  document.body.appendChild(img);
};

export const createButterflyTexture = (
  butterfly: ButterflyTier[]
): Uint8ClampedArray => {
  const width = butterfly.length;
  const height = butterfly[0].length;
  const texture = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const [b, a, [r, g]] = butterfly[j][i];
      texture[(width * i + j) * 4] = toClamped(r);
      texture[(width * i + j) * 4 + 1] = toClamped(g);
      texture[(width * i + j) * 4 + 2] = b;
      texture[(width * i + j) * 4 + 3] = a;
    }
  }

  return texture;
};
