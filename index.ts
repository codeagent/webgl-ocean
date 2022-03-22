import './style.css';
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
  scales: [1.0, 0.054, 0.01],
  resolution: 512,
  wind: vec2.fromValues(4.5, 4.5),
  strength: 1.0,
  croppiness: -1.0,
  alignment: 0.01
});
const simulation = new Simulation(gpu);

simulation.start(oceanField, 100, 256);
