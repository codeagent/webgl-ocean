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
  img.width = width;
  img.height = height;
  return img;
};

export const floatToUint8Clamped = (data: Float32Array) =>
  Uint8ClampedArray.from([...data].map((v) => toClamped(v)));
