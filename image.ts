import { ButterflyTier } from './butterfly';

export const toImage = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((r, j) => canvas.toBlob((b) => r(b), 'image/png', 1));

export const toClamped = (float: number) =>
  Math.floor((float * 0.5 + 0.5) * 255);

export const createImage = async (
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
