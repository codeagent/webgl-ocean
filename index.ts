import './style.css';
import { Gpu } from './ocean/gpu';
import { testDft, testFft } from './fft.test';
import { testdft2, testFft2 } from './fft2.test';
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
Gpu.init(canvas);

import {
  testHeightFieldIfft2,
  testHeightHkTexture,
} from './ocean/height-field.test';
import {
  testHeightFieldFactoryButterflyTexture,
  testHeightFieldFactoryH0texture,
} from './ocean/height-field-factory.test';
import { testButterfly } from './ocean/butterfly.test';
import { HeightFieldFactory } from './ocean/height-field-factory';
import { vec2, vec3 } from 'gl-matrix';
import { Viewport } from './graphics/viewport';
import { Camera } from './graphics/camera';
import { ArcRotationCameraController } from './graphics/camera-controller';

// for (let p = 1; p < 16; p++) {
//   testButterfly(1 << p);
// }
// testDft();
// testFft();
// testdft2();
// testFft2();
// testHeightFieldFactoryButterflyTexture();
// testHeightFieldFactoryH0texture();
// testHeightHkTexture();
testHeightFieldIfft2();

const heightField = HeightFieldFactory.instance.build({
  size: 100,
  subdivisions: 512,
  wind: vec2.fromValues(10.0, 10.0),
  strength: 2000000,  // @todo: what is that!
});
const camera = new Camera(
  45.0,
  canvas.width / canvas.height,
  heightField.params.size * 1.0e-2,
  heightField.params.size * 1.0e3
);
camera.position = vec3.fromValues(heightField.params.size, heightField.params.size, 0);
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
