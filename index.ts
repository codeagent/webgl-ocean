import './style.css';
import { vec2 } from 'gl-matrix';

import {
  testButterflyTexture,
  testDft,
  testFft,
  testDft2,
  testFft2,
  testOceanFieldIfft2,
  testFft2Hermitian,
  testOceanFieldIfft2HermitianProperty,
  testFft2Combined,
} from './test';

import { Simulation } from './simulation';

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testFft2Hermitian();
// testFft2Combined();
// testOceanFieldIfft2();
// testOceanFieldIfft2HermitianProperty();

const simulation = new Simulation(
  document.getElementById('viewport') as HTMLCanvasElement
);
simulation.start({
  size: 10,
  alignment: 0.01,
  minWave: 0.0,
  geometryResolution: 256,
  resolution: 512,
  wind: vec2.fromValues(5.0, 2.0),
  strength: 2.0,
  croppiness: -1.0,
  randomSeed: 0,
});
