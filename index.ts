import './style.css';
import { Gpu } from './wave/gpu';
import { testDft, testFft } from './fft.test';
import { testdft2, testFft2 } from './fft2.test';
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
Gpu.init(canvas);

import {
  testDisplacementFieldIfft2,
  testDisplacementFieldHkTexture,
} from './wave/displacement-field.test';
import {
  testDisplacementFieldFactoryButterflyTexture,
  testDisplacementFieldFactoryH0texture,
} from './wave/displacement-field-factory.test';
import { testButterflyTexture } from './wave/butterfly.test';
import { DisplacementFieldFactory } from './wave/displacement-field-factory';
import { vec2, vec3 } from 'gl-matrix';
import { Viewport } from './graphics/viewport';
import { Camera } from './graphics/camera';
import { ArcRotationCameraController } from './graphics/camera-controller';

// for (let p = 1; p < 16; p++) {
//   testButterflyTexture(1 << p);
// }
// testDft();
// testFft();
// testdft2();
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
