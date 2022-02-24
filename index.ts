import './style.css';
import { vec2 } from 'gl-matrix';

import {
  testButterflyTexture,
  testDft,
  testFft,
  testDft2,
  testFft2,
  testDisplacementFieldIfft2,
} from './test';

import { Simulation } from './simulation';

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testDisplacementFieldIfft2();

const simulation = new Simulation(
  document.getElementById('viewport') as HTMLCanvasElement
);
simulation.start({
  size: 100,
  geometryResolution: 256,
  resolution: 512,
  wind: vec2.fromValues(20.0, 10.0),
  strength: 4000000, // @todo: what is that!
  croppiness: -0.99,
});
