import './style.css';

import { testDft, testFft } from './fft.test';
import { testdft2, testFft2 } from './fft2.test';
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
// testHeightFieldIfft2();

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const heightField = HeightFieldFactory.instance.build({
  size: 100,
  subdivisions: 128,
  wind: vec2.fromValues(28.0, 28.0),
  strength: 4,
});
const camera = new Camera(
  45.0,
  canvas.width / canvas.height,
  heightField.params.size * 1.0e-2,
  heightField.params.size * 1.0e1
);
camera.position = vec3.fromValues(
  heightField.params.size,
  heightField.params.size,
  heightField.params.size
);
const controller = new ArcRotationCameraController(
  canvas,
  camera,
  vec3.fromValues(0.0, 0.0, 0.0)
);
const viewport = new Viewport(canvas, camera, heightField);

const step = () => {
  heightField.update(Date.now() / 1000.0);
  controller.update();
  console.log(camera.position);
  viewport.render();
  requestAnimationFrame(() => step());
};

step();
