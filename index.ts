// Import stylesheets
import './style.css';

import {
  createButterflyTexture,
  downloadImage,
  makeBatterflyTree,
  makeButterfly,
  testButterfly,
} from './fft2';
import { testDft, testFft } from './fft.test';
import { testFft2 } from './fft2.test';

const n = 512;
const indices = [...Array(n).keys()];
const tree = makeBatterflyTree(indices);

const butterfly = makeButterfly(tree);

// console.log(butterfly);

const texture = createButterflyTexture(butterfly);

// for (let p = 1; p < 16; p++) {
//   testButterfly(1 << p);
// }

document
  .getElementById('butterfly')
  .addEventListener('click', () => downloadImage(texture, Math.log2(n), n));

// const signal = Float32Array.from(
//   [...Array(16).keys()].map(() => Math.random() * 2.0 - 1.0)
// );

// const fourier = dft(signal);
// console.log(idft(dft(signal)).map(c => re(c)), signal);

// testDft();
// testFft();
testFft2();