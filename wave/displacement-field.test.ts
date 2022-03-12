import { vec2 } from 'gl-matrix';

import { createMockGpu } from '../graphics/gpu.mock';
import { DisplacementFieldFactory } from './displacement-field-factory';
import { float4ToComplex2d, ifft2, abs, sub } from '../fft';
import { add, areAqual, complex, Complex, mult, re } from '../fft/complex';
import { fft2 } from '../fft/fft2';

export const testDisplacementFieldIfft2 = () => {
  const gpu = createMockGpu();
  const factory = new DisplacementFieldFactory(gpu);
  const displacementField = factory.build({
    minWave: 0.0,
    alignment: 1.0,
    croppiness: -0.6,
    size: 100,
    resolution: 512,
    geometryResolution: 256,
    wind: vec2.fromValues(28.0, 28.0),
    strength: 1000000,
  });

  // Arrange
  const framebuffer = gpu.createRenderTarget();
  const buffer = new Float32Array(
    displacementField.params.resolution *
      displacementField.params.resolution *
      4
  );

  for (let slot of [0, 1, 2, 3]) {
    for (let couple of [0, 1]) {
      displacementField['generateSpectrumTextures'](performance.now());
      gpu.readValues(
        displacementField['spectrumFramebuffer'],
        buffer,
        displacementField.params.resolution,
        displacementField.params.resolution,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        slot
      );

      const expected = ifft2(
        float4ToComplex2d(
          buffer,
          displacementField.params.resolution,
          couple * 2
        )
      ).flat(1);

      // Act
      displacementField['ifft2']();
      gpu.attachTexture(
        framebuffer,
        displacementField['ifftTextures'][slot],
        0
      );
      gpu.readValues(
        framebuffer,
        buffer,
        displacementField.params.resolution,
        displacementField.params.resolution,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        0
      );

      const actual = float4ToComplex2d(
        buffer,
        displacementField.params.resolution,
        couple * 2
      ).flat(1);

      // Assert
      const diff = actual.map((a, i) => abs(sub(a, expected[i])));
      const closeEnougth = diff.every((v) => v <= 1.0e-5);
      if (!closeEnougth) {
        console.warn(
          `testDisplacementFieldIfft2 [slot ${slot}-${couple}]: Test don't passesd: `,
          diff
        );
        return;
      }
      console.log(
        `testDisplacementFieldIfft2 [slot ${slot}-${couple}]: Test passed!`
      );
    }
  }
};

export const testDisplacementFieldIfft2Hermitian = () => {
  const I = complex(0.0, 1.0);

  const gpu = createMockGpu();
  const factory = new DisplacementFieldFactory(gpu);
  const displacementField = factory.build({
    minWave: 0.0,
    alignment: 1.0,
    croppiness: -0.6,
    size: 100,
    resolution: 4,
    geometryResolution: 4,
    wind: vec2.fromValues(28.0, 28.0),
    strength: 1000000,
  });

  // Arrange
  const framebuffer = gpu.createRenderTarget();
  const buffer = new Float32Array(
    displacementField.params.resolution *
      displacementField.params.resolution *
      4
  );

  const signal0: Complex[][] = [
    ...Array(displacementField.params.resolution).keys(),
  ].map(() =>
    [...Array(displacementField.params.resolution).keys()]
      .map(() => Math.random() * 2.0 - 1.0)
      .map((v) => complex(v, 0.0))
  );

  const signal1: Complex[][] = [
    ...Array(displacementField.params.resolution).keys(),
  ].map(() =>
    [...Array(displacementField.params.resolution).keys()]
      .map(() => Math.random() * 2.0 - 1.0)
      .map((v) => complex(v, 0.0))
  );

  const spectrum0 = fft2(signal0).flat(1);
  const spectrum1 = fft2(signal1).flat(1);
  const combined = Float32Array.from(
    spectrum0
      .map((v, i) => add(v, mult(I, spectrum1[i])))
      .map((v) => [v, v])
      .flat(2)
  );

  const signal0Flat = signal0.flat();
  const signal1Flat = signal1.flat();
  const expected = signal0Flat.map((v, i) =>
    complex(re(v), re(signal1Flat[i]))
  );

  for (let slot of [0, 1, 2, 3]) {
    for (let couple of [0, 1]) {
      gpu.updateTexture(
        displacementField['spectrumTextures'][slot],
        displacementField.params.resolution,
        displacementField.params.resolution,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        combined
      );

      // Act
      displacementField['ifft2']();
      gpu.attachTexture(
        framebuffer,
        displacementField['ifftTextures'][slot],
        0
      );
      gpu.readValues(
        framebuffer,
        buffer,
        displacementField.params.resolution,
        displacementField.params.resolution,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        0
      );

      const actual = float4ToComplex2d(
        buffer,
        displacementField.params.resolution,
        couple * 2
      ).flat(1);

      // Assert
      const closeEnougth = actual.every((a, i) =>
        areAqual(a, expected[i], 1.0e-5)
      );
      if (!closeEnougth) {
        console.warn(
          `testDisplacementFieldIfft2Hermitian [slot ${slot}-${couple}]: Test don't pass`
        );
        return;
      }
      console.log(
        `testDisplacementFieldIfft2Hermitian [slot ${slot}-${couple}]: Test pass!`
      );
    }
  }
};
