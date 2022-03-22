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
import { Gpu } from './graphics';
import { OceanFieldBuilder } from './ocean';

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
  size: 10,
  scales: [1, 0.054, 0.001],
  resolution: 512,
  wind: vec2.fromValues(5.0, 2.0),
  strength: 2.0,
  croppiness: -1.0,
});
const simulation = new Simulation(gpu);

simulation.start(oceanField, oceanField.params.size, 256);
