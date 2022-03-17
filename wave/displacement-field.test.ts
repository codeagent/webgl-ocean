import { vec2 } from 'gl-matrix';

import { createMockGpu } from '../graphics/gpu.mock';
import { DisplacementFieldFactory } from './displacement-field-factory';
import { float4ToComplex2d, ifft2, abs, sub, im } from '../fft';

export const testDisplacementFieldIfft2 = () => {
  const gpu = createMockGpu();
  const factory = new DisplacementFieldFactory(gpu);
  const displacementField = factory.build({
    minWave: 0.0,
    alignment: 0.0,
    croppiness: -1.0,
    size: 100,
    resolution: 512,
    geometryResolution: 256,
    wind: vec2.fromValues(28.0, 28.0),
    strength: 1,
  });

  // Arrange
  const framebuffer = gpu.createRenderTarget();
  const buffer = new Float32Array(
    displacementField.params.resolution *
      displacementField.params.resolution *
      4
  );

  for (let slot of [0, 1]) {
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

// @todo: fix test
export const testDisplacementFieldIfft2HermitianProperty = () => {
  const gpu = createMockGpu();
  const factory = new DisplacementFieldFactory(gpu);
  const displacementField = factory.build({
    minWave: 0.0,
    alignment: 0.0,
    croppiness: -1.0,
    size: 100,
    resolution: 4,
    geometryResolution: 256,
    wind: vec2.fromValues(28.0, 28.0),
    strength: 1,
  });

  // Arrange
  const framebuffer = gpu.createRenderTarget();
  const buffer = new Float32Array(
    displacementField.params.resolution *
      displacementField.params.resolution *
      4
  );

  for (let slot of [0, 1]) {
    for (let couple of [0, 1]) {
      displacementField['generateSpectrumTextures'](performance.now());

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
      const _im = actual.map((v) => im(v));
      const isCloseToReal = _im.every((v) => Math.abs(v) <= 1.0e-4);
      if (!isCloseToReal) {
        const max = _im.reduce(
          (max, curr) => (curr > max ? curr : max),
          Number.NEGATIVE_INFINITY
        );

        const min = _im.reduce(
          (min, curr) => (curr < min ? curr : min),
          Number.POSITIVE_INFINITY
        );

        console.warn(
          `testDisplacementFieldIfft2HermitianProperty [slot ${slot}-${couple}]: Test don't pass: [max: ${max}, min: ${min}]`
        );
        return;
      }
      console.log(
        `testDisplacementFieldIfft2HermitianProperty [slot ${slot}-${couple}]: Test passed!`
      );
    }
  }
};
