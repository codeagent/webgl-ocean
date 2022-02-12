import { vec2 } from 'gl-matrix';
import { complex, Complex } from '../complex';
import { fft } from '../fft';
import { fft2 } from '../fft2';
import { HeightFieldFactory } from './height-field-factory';

const heightField = HeightFieldFactory.instance.build({
  size: 1000,
  subdivisions: 32,
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
  const expected = signal.map((row) => fft(row)).flat(2);

  gpu.updateTexture(
    hkTexture,
    heightField.params.subdivisions,
    heightField.params.subdivisions,
    WebGL2RenderingContext.RG,
    WebGL2RenderingContext.FLOAT,
    Float32Array.from(signal.flat(2))
  );

  // Act
  heightField['fft2'](hkTexture);
  gpu.attachTexture(framebuffer, hkTexture, 0);
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

  // Assert
  console.log(expected, actual);
};
