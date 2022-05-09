import './style.css';
import { vec3 } from 'gl-matrix';
import { animationFrames } from 'rxjs';

import { Viewport } from './viewport';
import { Camera, Gpu } from './graphics';
import { OceanFieldBuilder, OceanFieldBuoyancy } from './ocean';
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
import { World } from './physics';

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
canvas.width = self.screen.width;
canvas.height = self.screen.height;
const context = canvas.getContext('webgl2');
if (!context) {
  throw new Error('Failed to create webgl2 drawing context');
}
const gpu = new Gpu(context);
const camera = new Camera(45.0, canvas.width / canvas.height, 1.0e-1, 1.0e6);
camera.lookAt(vec3.fromValues(-10, 2.5, -10), vec3.create());

const cameraController = new FpsCameraController(canvas, camera);
const gui = new Gui(document.getElementById('gui'));
const oceanBuilder = new OceanFieldBuilder(gpu);
const oceanField = oceanBuilder.build(gui.params);
const buoyancy = new OceanFieldBuoyancy(oceanField);
const world = new World();
const viewport = new Viewport(
  gpu,
  oceanField,
  world,
  buoyancy,
  cameraController
);

gui.onChange$.subscribe((params) => {
  oceanBuilder.update(oceanField, params);
  viewport.tileRenderer.setSettings(params.tileRenderer);
  viewport.plateRenderer.setSettings(params.plateRenderer);
  viewport.projectedGridRenderer.setSettings(params.gridRenderer);
});

animationFrames().subscribe(({ elapsed }) => {
  buoyancy.update();
  world.integrate(1 / 60);
  cameraController.update(1 / 60);
  oceanField.update(elapsed / 1e3);
  viewport.render(gui.params.renderer);
});
