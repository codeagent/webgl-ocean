import { vec2 } from 'gl-matrix';
import {
  createImage,
  float2ToUint8Clamped,
  float4ToUint8Clamped,
} from '../image';

import { HeightFieldFactory } from './height-field-factory';

const factory = HeightFieldFactory.instance;

const heightField = factory.build({
  size: 1000,
  subdivisions: 256,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 4.0,
});
const noise = factory['noiseTexture'].get(heightField.params.subdivisions);
const butterfly = heightField['butterflyTexture'];
const gpu = factory['gpu'];
const framebuffer = factory['frameBuffer'];
const h0texture = heightField['h0Texture'];

export const testHeightFieldFactoryButterflyTexture = () => {
  gpu.attachTexture(framebuffer, butterfly, 0);
  const values = new Float32Array(
    heightField.params.subdivisions *
      Math.log2(heightField.params.subdivisions) *
      4
  );
  gpu.readValues(
    framebuffer,
    values,
    Math.log2(heightField.params.subdivisions),
    heightField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );
  gpu.flush();

  createImage(
    float4ToUint8Clamped(values),
    Math.log2(heightField.params.subdivisions),
    heightField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};

export const testHeightFieldFactoryH0texture = () => {
  gpu.attachTexture(framebuffer, h0texture, 0);
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

  createImage(
    float4ToUint8Clamped(values),
    heightField.params.subdivisions,
    heightField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};
