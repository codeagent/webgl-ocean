import './style.css';
import { Gpu } from './graphics';
import {
  testButterflyTexture,
  testDft,
  testFft,
  testDft2,
  testFft2,
  testDisplacementFieldFactoryButterflyTexture,
  testDisplacementFieldFactoryH0texture,
  testDisplacementFieldHkTexture,
  testDisplacementFieldIfft2,
} from './test';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
Gpu.init(canvas);

import { DisplacementFieldFactory } from './wave/displacement-field-factory';
import { vec2, vec3 } from 'gl-matrix';
import { Viewport } from './graphics/viewport';
import { Camera } from './graphics/camera';
import { ArcRotationCameraController } from './graphics/camera-controller';

// testButterflyTexture();
// testDft();
// testFft();
// testDft2();
// testFft2();
// testDisplacementFieldFactoryButterflyTexture();
// testDisplacementFieldFactoryH0texture();
// testDisplacementFieldHkTexture();
// testDisplacementFieldIfft2();

const heightField = DisplacementFieldFactory.instance.build({
  size: 100,
  subdivisions: 512,
  wind: vec2.fromValues(10.0, 10.0),
  strength: 2000000, // @todo: what is that!
});
const camera = new Camera(
  45.0,
  canvas.width / canvas.height,
  heightField.params.size * 1.0e-2,
  heightField.params.size * 1.0e3
);
camera.position = vec3.fromValues(
  heightField.params.size,
  heightField.params.size,
  0
);
const controller = new ArcRotationCameraController(
  canvas,
  camera,
  vec3.fromValues(0.0, 0.0, 0.0),
  1.0e-2,
  heightField.params.size * 0.25
);
const viewport = new Viewport(canvas, camera, heightField);

const step = () => {
  heightField.update(performance.now() / 1000);
  controller.update();
  viewport.render();
  requestAnimationFrame(() => step());
};

step();
