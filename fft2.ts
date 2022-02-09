import { abs, add, complex, Complex, eix, mult, sub } from './complex';
import { dft, fft, idft } from './fft';

export const dft2 = (signal: Complex[][]): Complex[][] => {
  const n = signal.length;
  const m = signal?.[0].length;

  const fourier: Complex[][] = [];

  // Horizontal DFT
  for (let i = 0; i < m; i++) {
    fourier.push(dft(signal[i]));
  }

  // Vertical DFT
  const col = new Array<Complex>(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = dft(col);

    for (let i = 0; i < m; i++) {
      fourier[i][j] = f[i];
    }
  }

  return fourier;
};

export const idft2 = (fourier: Complex[][]): Complex[][] => {
  const n = fourier.length;
  const m = fourier?.[0].length;
  const signal: Complex[][] = [...Array(m).keys()].map(() => []);

  // Vertical IDFT
  const col = new Array<Complex>(m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      col[i] = fourier[i][j];
    }
    const f = idft(col);

    for (let i = 0; i < m; i++) {
      signal[i].push(f[i]);
    }
  }

  // Horizontal IDFT
  for (let i = 0; i < m; i++) {
    signal[i] = idft(signal[i]);
  }

  return signal;
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
  const signal = [...Array(size).keys()]
    .map(() => Math.random() * 2.0 - 1.0)
    .map((v) => complex(v, 0));

  const tree = makeBatterflyTree([...Array(size).keys()]);
  const butterfly = makeButterfly(tree);

  const pingPong = [new Array<Complex>(size), new Array<Complex>(size)];
  pingPong[0] = [...signal];

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
  const expected: Complex[] = fft(signal);

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
