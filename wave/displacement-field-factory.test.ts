import { vec2 } from 'gl-matrix';
import {
  createImage,
  float2ToUint8Clamped,
  float4ToUint8Clamped,
} from '../image';

import { DisplacementFieldFactory } from './displacement-field-factory';

const factory = DisplacementFieldFactory.instance;

const DisplacementField = factory.build({
  size: 1000,
  subdivisions: 256,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 4.0,
});
const noise = factory['noiseTexture'].get(
  DisplacementField.params.subdivisions
);
const butterfly = DisplacementField['butterflyTexture'];
const gpu = factory['gpu'];
const framebuffer = factory['frameBuffer'];
const h0texture = DisplacementField['h0Texture'];

export const testDisplacementFieldFactoryButterflyTexture = () => {
  gpu.attachTexture(framebuffer, butterfly, 0);
  const values = new Float32Array(
    DisplacementField.params.subdivisions *
      Math.log2(DisplacementField.params.subdivisions) *
      4
  );
  gpu.readValues(
    framebuffer,
    values,
    Math.log2(DisplacementField.params.subdivisions),
    DisplacementField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );
  gpu.flush();

  createImage(
    float4ToUint8Clamped(values),
    Math.log2(DisplacementField.params.subdivisions),
    DisplacementField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};

export const testDisplacementFieldFactoryH0texture = () => {
  gpu.attachTexture(framebuffer, h0texture, 0);
  const values = new Float32Array(
    DisplacementField.params.subdivisions *
      DisplacementField.params.subdivisions *
      4
  );
  gpu.readValues(
    framebuffer,
    values,
    DisplacementField.params.subdivisions,
    DisplacementField.params.subdivisions,
    WebGL2RenderingContext.RGBA,
    WebGL2RenderingContext.FLOAT
  );
  gpu.flush();

  createImage(
    float4ToUint8Clamped(values),
    DisplacementField.params.subdivisions,
    DisplacementField.params.subdivisions
  ).then((img) => document.body.appendChild(img));
};
