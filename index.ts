import './style.css';

import { testDft, testFft } from './fft.test';
import { testdft2, testFft2 } from './fft2.test';
import { testHeightFieldIfft2, testHeightHkTexture } from './ocean/height-field.test';
import {
  testHeightFieldFactoryButterflyTexture,
  testHeightFieldFactoryH0texture,
} from './ocean/height-field-factory.test';
import { testButterfly } from './ocean/butterfly.test';

// for (let p = 1; p < 16; p++) {
//   testButterfly(1 << p);
// }

// testDft();
// testFft();
// testdft2();
// testFft2();
// testHeightFieldFactoryButterflyTexture();
// testHeightFieldFactoryH0texture();
testHeightFieldIfft2();
testHeightHkTexture();
