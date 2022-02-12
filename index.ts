import './style.css';

import { testDft, testFft } from './fft.test';
import { testdft2, testFft2 } from './fft2.test';
import { createButterflyTexture } from './ocean/butterfly';
import { createImage, float4ToUint8Clamped } from './image';
import { testButterfly } from './ocean/butterfly.test';

import './ocean/sandbox';
import { testHeightFieldFft2 } from './ocean/height-field.test';

document.getElementById('butterfly').addEventListener('click', async () => {
  const n = 512;
  const texture = createButterflyTexture(n);
  const img = await createImage(float4ToUint8Clamped(texture), Math.log2(n), n);
  document.body.appendChild(img);
  img.width = n;
});

// testDft();
// testFft();
// testdft2();
// testFft2();
testHeightFieldFft2();

// for (let p = 1; p < 16; p++) {
//   testButterfly(1 << p);
// }
