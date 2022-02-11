import { vec2 } from 'gl-matrix';
import { createImage, floatToUint8Clamped } from '../image';

import { HeightFieldFactory } from './height-field-factory';

const factory = HeightFieldFactory.instance;

const heightField = factory.build({
  size: 100.0,
  subdivisions: 128,
  wind: vec2.fromValues(10.0, 10.0),
  strength: 1.0,
});

const noise = factory['noiseTexture'].get(heightField.params.subdivisions);
const h0 = heightField['h0Texture'];
const butterfly = heightField['butterflyTexture'];
const gpu = factory['gpu'];
const framebuffer = factory['frameBuffer'];

gpu.setRenderTarget(framebuffer);
gpu.attachTexture(framebuffer, h0, 0);

const values = new Float32Array(
  heightField.params.subdivisions * heightField.params.subdivisions * 4
);
gpu.readValues(
  framebuffer,
  values,
  heightField.params.subdivisions,
  heightField.params.subdivisions,
  WebGL2RenderingContext.RGBA,
  WebGL2RenderingContext.FLOAT
);
gpu.flush();

console.log(values)

createImage(
  floatToUint8Clamped(values),
  heightField.params.subdivisions,
  heightField.params.subdivisions
).then((img) => document.body.appendChild(img));
