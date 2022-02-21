import { vec2 } from 'gl-matrix';

import { createMockGpu } from '../graphics/gpu.mock';
import { DisplacementFieldFactory } from './displacement-field-factory';
import { float4ToComplex2d, ifft2, abs, sub } from '../fft';

const factory = new DisplacementFieldFactory(createMockGpu());

const displacementField = factory.build({
  croppiness: -0.6,
  size: 100,
  subdivisions: 256,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 1000000,
});

const gpu = displacementField['gpu'];
const framebuffer = displacementField['framebuffer'];

export const testDisplacementFieldIfft2 = () => {
  // Arrange
  const buffer = new Float32Array(
    displacementField.params.subdivisions *
      displacementField.params.subdivisions *
      4
  );

  displacementField['generateHkTexture'](0);
  gpu.attachTexture(framebuffer, displacementField['hkTexture'], 0);
  gpu.readValues(
    framebuffer,
    buffer,
    displacementField.params.subdivisions,
    displacementField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );

  const expected = ifft2(
    float4ToComplex2d(buffer, displacementField.params.subdivisions)
  ).flat(1);

  // Act
  displacementField['ifft2']();
  gpu.attachTexture(framebuffer, displacementField['ifftTexture'], 0);
  gpu.readValues(
    framebuffer,
    buffer,
    displacementField.params.subdivisions,
    displacementField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );

  const actual = float4ToComplex2d(
    buffer,
    displacementField.params.subdivisions
  ).flat(1);

  // Assert
  const diff = actual.map((a, i) => abs(sub(a, expected[i])));
  const closeEnougth = diff.every((v) => v <= 1.0e-4);
  if (!closeEnougth) {
    console.warn("testDisplacementFieldIfft2: Test don't passesd: ", diff);
    return;
  }
  console.log('testDisplacementFieldIfft2: Test passed!');
};
