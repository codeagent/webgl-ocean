import { createButterflyTexture } from './butterfly';
import { abs, add, complex, Complex, mult, scale, sub } from '../complex';
import { ifft } from '../fft';

export const testButterflyTexture = (size: number) => {
  // Arrange
  const signal = [...Array(size).keys()]
    .map(() => Math.random() * 2.0 - 1.0)
    .map((v) => complex(v, 0));

  const pingPong = [[...signal], new Array<Complex>(size)];
  const butterfly = createButterflyTexture(size);
  const phases = Math.log2(size);

  let src = 0;
  let dest = 1;
  for (let phase = 0; phase < phases; phase++) {
    for (let k = 0; k < size; k++) {
      const [re, im, i, j] = new Float32Array(
        butterfly.buffer,
        (phases * k + phase) * 4 * Float32Array.BYTES_PER_ELEMENT,
        4
      );

      pingPong[dest][k] = scale(
        add(
          pingPong[src][Math.trunc(i)],
          mult(pingPong[src][Math.trunc(j)], complex(re, im))
        ),
        0.5
      );
    }

    src = dest;
    dest = (dest + 1) % 2;
  }

  // --
  const actual: Complex[] = pingPong[src];
  const expected: Complex[] = ifft(signal);

  const diff = actual.map((a, i) => abs(sub(a, expected[i])));
  const closeEnougth = diff.every((v) => v <= 1.0e-5);
  if (!closeEnougth) {
    console.warn("Test don't passesd: ", diff);
  } else {
    console.log('Test passed!');
  }
};
