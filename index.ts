// Import stylesheets
import './style.css';

import { testDft, testFft } from './fft.test';
import { testdft2, testFft2 } from './fft2.test';
import { makeBatterflyTree, makeButterfly } from './butterfly';
import { createButterflyTexture, createImage } from './image';
import { testButterfly } from './butterfly.test';

document.getElementById('butterfly').addEventListener('click', () => {
  const n = 512;
  const indices = [...Array(n).keys()];
  const tree = makeBatterflyTree(indices);
  const butterfly = makeButterfly(tree);
  const texture = createButterflyTexture(butterfly);

  createImage(texture, Math.log2(n), n);
});

testDft();
testFft();
testdft2();
testFft2();

for (let p = 1; p < 16; p++) {
  testButterfly(1 << p);
}
