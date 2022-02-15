import { vec2 } from 'gl-matrix';

import { createImage, float2ToUint8Clamped } from '../image';
import { HeightFieldFactory } from './height-field-factory';

const heightField = HeightFieldFactory.instance.build({
  size: 1000,
  subdivisions: 128,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 4,
});

const gpu = heightField['gpu'];
const hkTexture = heightField['hkTexture'];
const framebuffer = heightField['framebuffer'];

export const testHeightHkTexture = () => {
  // Arrange
  const result = heightField['generateHkTexture'](0);
  gpu.attachTexture(framebuffer, result, 0);
  const actual = new Float32Array(
    heightField.params.subdivisions * heightField.params.subdivisions * 2
  );
  gpu.readValues(
    framebuffer,
    actual,
    heightField.params.subdivisions,
    heightField.params.subdivisions,
    WebGL2RenderingContext.RG,
    WebGL2RenderingContext.FLOAT
  );

  // Display
  createImage(
    float2ToUint8Clamped(Float32Array.from(actual)),
    heightField.params.subdivisions,
    heightField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};

export const testHeightFieldIfft2 = () => {
  // Arrange
  heightField['generateHkTexture'](0);

  // Act
  const result = heightField['ifft2'](hkTexture);
  gpu.attachTexture(framebuffer, result, 0);
  const actual = new Float32Array(
    heightField.params.subdivisions * heightField.params.subdivisions * 2
  );
  gpu.readValues(
    framebuffer,
    actual,
    heightField.params.subdivisions,
    heightField.params.subdivisions,
    WebGL2RenderingContext.RG,
    WebGL2RenderingContext.FLOAT
  );

  createImage(
    float2ToUint8Clamped(Float32Array.from(actual), true),
    heightField.params.subdivisions,
    heightField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};
