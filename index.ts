// Import stylesheets
import './style.css';

import {
  createButterflyTexture,
  downloadImage,
  makeBatterflyTree,
  makeButterfly,
  testButterfly,
} from './fft';

const n = 512;
const indices = [...Array(n).keys()];
const tree = makeBatterflyTree(indices);

const butterfly = makeButterfly(tree);

console.log(butterfly);

const texture = createButterflyTexture(butterfly);

for (let p = 1; p < 16; p++) {
  testButterfly(1 << p);
}

document
  .getElementById('butterfly')
  .addEventListener('click', () => downloadImage(texture, Math.log2(n), n));
