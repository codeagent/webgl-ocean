import './style.css';
import { vec2 } from 'gl-matrix';

import { Viewport } from './viewport';
import { Gpu } from './graphics';
import { OceanField, OceanFieldBuilder } from './ocean';
import { Gui } from './gui';

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
import { tap } from 'rxjs/operators';

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
const viewport = new Viewport(gpu);
const gui = new Gui(document.getElementById('gui'));
const oceanBuilder = new OceanFieldBuilder(gpu);

let oceanField: OceanField = null;
let tiles: number = 1;
gui.onChange$.subscribe((params) => {
  oceanField?.dispose();
  oceanField = oceanBuilder.build(params);
  viewport.oceanRenderer.geometryResolution = params.geometryResolution;
  viewport.oceanRenderer.geometrySize = params.geometrySize;
  tiles = params.times;
});

const step = () => {
  if (oceanField) {
    oceanField.update(performance.now() / 1e3 + 36000);
    viewport.render(oceanField, tiles);
  }
  requestAnimationFrame(() => step());
};

requestAnimationFrame(() => step());
