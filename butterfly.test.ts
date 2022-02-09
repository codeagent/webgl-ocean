import { makeBatterflyTree, makeButterfly } from './butterfly';
import { abs, add, complex, Complex, mult, sub } from './complex';
import { fft } from './fft';

export const testButterfly = (size: number) => {
  const signal = [...Array(size).keys()]
    .map(() => Math.random() * 2.0 - 1.0)
    .map((v) => complex(v, 0));

  const tree = makeBatterflyTree([...Array(size).keys()]);
  const butterfly = makeButterfly(tree);

  const pingPong = [new Array<Complex>(size), new Array<Complex>(size)];
  pingPong[0] = [...signal];

  let src = 0;
  let dest = 1;

  for (let phase of butterfly) {
    for (let k = 0; k < phase.length; k++) {
      const [i, j, w] = phase[k];
      pingPong[dest][k] = add(pingPong[src][i], mult(pingPong[src][j], w));
    }

    src = dest;
    dest = (dest + 1) % 2;
  }

  // --
  const actual: Complex[] = pingPong[src];
  const expected: Complex[] = fft(signal);

  const diff = actual.map((a, i) => abs(sub(a, expected[i])));
  const closeEnougth = diff.every((v) => v <= 1.0e-5);
  if (!closeEnougth) {
    console.warn("Test don't passesd: ", diff);
  } else {
    console.log('Test passed!');
  }
};
