import { vec2 } from 'gl-matrix';
import { complex, Complex } from '../complex';
import { dft, fft } from '../fft';
import { createImage, float2ToUint8Clamped } from '../image';
import { HeightFieldFactory } from './height-field-factory';

const heightField = HeightFieldFactory.instance.build({
  size: 1000,
  subdivisions: 128,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 4.0,
});

const gpu = heightField['gpu'];
const hkTexture = heightField['hkTexture'];
const framebuffer = heightField['framebuffer'];

export const testHeightFieldFft2 = () => {
  // Arrange
  const signal: Complex[][] = [
    ...Array(heightField.params.subdivisions).keys(),
  ].map(() =>
    [...Array(heightField.params.subdivisions).keys()]
      .map(() => Math.random() * 2.0 - 1.0)
      .map((v) => complex(v, 0.0))
  );

  gpu.updateTexture(
    hkTexture,
    heightField.params.subdivisions,
    heightField.params.subdivisions,
    WebGL2RenderingContext.RG,
    WebGL2RenderingContext.FLOAT,
    Float32Array.from(signal.flat(2))
  );

  // Act
  const result = heightField['fft2'](hkTexture);
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
  gpu.flush();

  const expected = signal.map((row) => fft(row)).flat(2);

  // Assert
  const diff = [...actual]
    .map((a, i) => [i, a, expected[i], Math.abs(a - expected[i])])
    .filter((v) => v[3] >= 1.0e-5);

  if (diff.length) {
    console.warn("Test don't passed: ", diff);
  } else {
    console.log('Test passed!');
  }

  // createImage(
  //   float2ToUint8Clamped(Float32Array.from(expected)),
  //   heightField.params.subdivisions,
  //   heightField.params.subdivisions
  // ).then((img) => document.body.appendChild(img));

  // createImage(
  //   float2ToUint8Clamped(Float32Array.from(actual)),
  //   heightField.params.subdivisions,
  //   heightField.params.subdivisions
  // ).then((img) => document.body.appendChild(img));
};
