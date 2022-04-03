import './style.css';

import { Viewport } from './viewport';
import { Gpu } from './graphics';
import { OceanFieldBuilder } from './ocean';
import { Gui } from './gui';
import { registerWorkerGlobals } from './thread';

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

registerWorkerGlobals();

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const gpu = new Gpu(
  canvas.getContext('webgl2', { preserveDrawingBuffer: true })
);
const viewport = new Viewport(gpu);
const gui = new Gui(document.getElementById('gui'));
const oceanBuilder = new OceanFieldBuilder(gpu);
const oceanField = oceanBuilder.build(gui.params);

gui.onChange$.subscribe((params) => {
  oceanBuilder.update(oceanField, params);
  viewport.tileRenderer.setSettings(params.tileRenderer);
  viewport.plateRenderer.setSettings(params.plateRenderer);
});

const step = () => {
  if (oceanField) {
    oceanField.update(performance.now() / 1e3 + 36000);
    viewport.render(oceanField, gui.params.renderer);
  }
  requestAnimationFrame(() => step());
};

requestAnimationFrame(() => step());
