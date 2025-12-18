import { ifft2 } from '../fft/fft';
import { createMockGpu } from '../graphics/gpu.mock';
import { IFFT2 } from '../fft/ifft2';
import {
  areCloseEnough,
  float4Random,
  float4ToComplex2d,
  getDiff,
} from './utils';

export const testIFFT2 = () => {
  const gpu = createMockGpu();
  const LAYERS = 8;

  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const textures = gpu.createFloat4TextureArray(size, size, LAYERS);
    const ifft = new IFFT2(gpu, size, LAYERS, textures);
    const frameBuffer = gpu.createRenderTarget();
    const byteBuffer = float4Random(size * size * LAYERS, 10);
    const expected = [];
    

    for (let layer = 0; layer < LAYERS; layer++) {
      gpu.updateTexture2dArray(
        textures,
        size,
        size,
        layer,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        new Float32Array(
          byteBuffer.buffer,
          size * size * layer * Float32Array.BYTES_PER_ELEMENT
        )
      );

      expected.push([
        ifft2(
          float4ToComplex2d(byteBuffer, size, size * size * layer),
          true
        ), // xy
        ifft2(
          float4ToComplex2d(byteBuffer, size, size * size * layer + 2),
          true
        ), // zw
      ]);
    }

    byteBuffer.fill(Number.MAX_SAFE_INTEGER);

    // Act
    ifft.compute();

    // Assert
    const actual = [];
    gpu.attachTextureArray(frameBuffer, textures, LAYERS);

    for (let layer = 0; layer < LAYERS; layer++) {
      gpu.readValues(
        frameBuffer,
        new Float32Array(
          byteBuffer.buffer,
          size * size * layer * Float32Array.BYTES_PER_ELEMENT
        ),
        size,
        size,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        layer
      );
      actual.push([
        float4ToComplex2d(byteBuffer, size, size * size * layer), // xy
        float4ToComplex2d(byteBuffer, size, size * size * layer + 2), // zw
      ]);
    }

    if (!areCloseEnough(actual.flat(3), expected.flat(3), 5.0e-2)) {
      console.warn(
        "testIFFT2: Test didn't pass: ",
        getDiff(actual.flat(3), expected.flat(3))
      );
      return false;
    }

    ifft.dispose();
    gpu.destroyTexture(textures);
    gpu.destroyRenderTarget(frameBuffer);
  }

  console.log('testIFFT2: Test passed!');

  return true;
};
