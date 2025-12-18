// Import stylesheets
import './style.css';
import { Texture2d } from './graphics/gpu';
import { Application } from './application';
import { testButterfly, testFft, testFft2 } from './test/fft.test';
import { testIFFT2 } from './test/ifft2.test';

console.clear();

// -
const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const context = canvas.getContext('webgl2');
if (!context) {
  throw new Error('Failed to create webgl2 drawing context');
}

const app = new Application(context);
//  [testFft, testButterfly, testFft2, testIFFT2].forEach(t => t())

function step(t: number) {
  app.step(t / 1e3);
  requestAnimationFrame(step);
}

requestAnimationFrame(step);

window.addEventListener('unload', () => {
  app.dispose();
});
