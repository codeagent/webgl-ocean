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
  testDisplacementFieldHkTexture,
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
// testDisplacementFieldHkTexture();
// testDisplacementFieldIfft2();

const simulation = new Simulation(
  document.getElementById('viewport') as HTMLCanvasElement
);
simulation.start({
  size: 100,
  subdivisions: 512,
  wind: vec2.fromValues(10.0, 10.0),
  strength: 2000000, // @todo: what is that!
});
