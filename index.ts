import './style.css';
import { vec3 } from 'gl-matrix';

import { Viewport } from './viewport';
import { Camera, Gpu } from './graphics';
import { OceanFieldBuilder } from './ocean';
import { Gui } from './gui';
import { registerWorkerGlobals } from './thread';
import { FpsCameraController } from './controller';

import {
  testButterflyTexture,
  testDft,
  testFft,
  testDft2,
  testFft2,
  testOceanFieldIfft2,
  testFft2Hermitian,
  testFft2Combined,
  testOceanFieldBuilderHermitianSpectrum,
} from './test';

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testFft2Hermitian();
// testFft2Combined();
// testOceanFieldIfft2();
// testOceanFieldBuilderHermitianSpectrum();

registerWorkerGlobals();

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const gpu = new Gpu(
  canvas.getContext('webgl2', { preserveDrawingBuffer: true })
);
const camera = new Camera(45.0, canvas.width / canvas.height, 1.0e-1, 1.0e4);
camera.lookAt(vec3.fromValues(-10, 2.5, -10), vec3.create());

const cameraController = new FpsCameraController(canvas, camera);
const viewport = new Viewport(gpu, cameraController);
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
