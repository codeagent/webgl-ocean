import './style.css';
import './gui';
import { vec2 } from 'gl-matrix';
import { Simulation } from './simulation';
import { Gpu } from './graphics';
import { OceanFieldBuilder } from './ocean';

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

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testFft2Hermitian();
// testFft2Combined();
// testOceanFieldIfft2();
// testOceanFieldIfft2HermitianProperty();

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const gpu = new Gpu(
  canvas.getContext('webgl2', { preserveDrawingBuffer: true })
);
const oceanBuilder = new OceanFieldBuilder(gpu);
const oceanField = oceanBuilder.build({
  size: 100,
  scales: [1.0, 0.6, 0.06],
  resolution: 256,
  wind: vec2.fromValues(1.5, 2.5),
  strength: 2,
  croppiness: -1.9,
  alignment: 1.0
});
const simulation = new Simulation(gpu);

simulation.start(oceanField, 33.33, 256);
