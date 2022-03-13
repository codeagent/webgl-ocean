import './style.css';
import { vec2 } from 'gl-matrix';

import {
  testButterflyTexture,
  testDft,
  testFft,
  testDft2,
  testFft2,
  testDisplacementFieldIfft2,
  testFft2Hermitian,
  testDisplacementFieldIfft2Hermitian,
  testFft2Combined
  
} from './test';

import { Simulation } from './simulation';

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testDisplacementFieldIfft2();
testFft2Hermitian();
// testFft2Combined();
// testDisplacementFieldIfft2Hermitian();

const simulation = new Simulation(
  document.getElementById('viewport') as HTMLCanvasElement
);
simulation.start({
  size: 10,
  alignment: 0.01,
  minWave: 0.001,
  geometryResolution: 256,
  resolution: 512,
  wind: vec2.fromValues(10.0, 1.0),
  strength: 300000000, // @todo: what is that!
  croppiness: -1.0,
});
