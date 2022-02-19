import { vec2 } from 'gl-matrix';

import {
  createImage,
  float2ToUint8Clamped,
  float4ToUint8Clamped,
} from '../image';
import { createMockGpu } from '../graphics/gpu.mock';
import { DisplacementFieldFactory } from './displacement-field-factory';

const factory = new DisplacementFieldFactory(createMockGpu());

const displacementField = factory.build({
  size: 1000,
  subdivisions: 128,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 4,
});

const gpu = displacementField['gpu'];
const hkTexture = displacementField['hkTexture'];
const framebuffer = displacementField['framebuffer'];

export const testDisplacementFieldHkTexture = () => {
  // Arrange
  const result = displacementField['generateHkTexture'](0);
  gpu.attachTexture(framebuffer, result, 0);
  const actual = new Float32Array(
    displacementField.params.subdivisions *
      displacementField.params.subdivisions *
      4
  );
  gpu.readValues(
    framebuffer,
    actual,
    displacementField.params.subdivisions,
    displacementField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );

  // Display
  createImage(
    float4ToUint8Clamped(Float32Array.from(actual)),
    displacementField.params.subdivisions,
    displacementField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};

export const testDisplacementFieldIfft2 = () => {
  // Arrange
  displacementField['generateHkTexture'](0);

  // Act
  const result = displacementField['ifft2'](hkTexture);
  gpu.attachTexture(framebuffer, result, 0);
  const actual = new Float32Array(
    displacementField.params.subdivisions *
      displacementField.params.subdivisions *
      4
  );
  gpu.readValues(
    framebuffer,
    actual,
    displacementField.params.subdivisions,
    displacementField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );

  createImage(
    float4ToUint8Clamped(Float32Array.from(actual), true),
    displacementField.params.subdivisions,
    displacementField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};
