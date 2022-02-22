import './style.css';
import { vec2 } from 'gl-matrix';

import {
  testButterflyTexture,
  testDft,
  testFft,
  testDft2,
  testFft2,
  testDisplacementFieldFactoryButterflyTexture,
  testDisplacementFieldFactoryH0texture,
  testDisplacementFieldIfft2,
} from './test';


import { Simulation } from './simulation';

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testDisplacementFieldFactoryButterflyTexture();
// testDisplacementFieldFactoryH0texture();
// testDisplacementFieldIfft2();

const simulation = new Simulation(
  document.getElementById('viewport') as HTMLCanvasElement
);
simulation.start({
  size: 100,
  subdivisions: 512,
  wind: vec2.fromValues(1.0, 2.0),
  strength: 2000000, // @todo: what is that!
  croppiness: -0.85
});
