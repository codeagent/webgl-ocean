import { abs, Complex, complex, sub } from './complex';
import { dft2, fft2, idft2, ifft2 } from './fft2';

export const testDft2 = () => {
  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const signal: Complex[][] = [...Array(size).keys()].map(() =>
      [...Array(size).keys()]
        .map(() => Math.random() * 2.0 - 1.0)
        .map((v) => complex(v, 0.0))
    );

    // Act
    const fourier = dft2(signal);
    const inverse = idft2(fourier);

    // Assert
    const sf = signal.flat();
    const iftf = inverse.flat();

    const diff = sf.map((v, i) => abs(sub(v, iftf[i])));
    const closeEnougth = diff.every((v) => v <= 1.0e-5);
    if (!closeEnougth) {
      console.warn("testDft2: Test don't passesd: ", diff);
      return;
    }
  }

  console.log('testDft2: Test passed!');
};

export const testFft2 = () => {
  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const signal: Complex[][] = [...Array(size).keys()].map(() =>
      [...Array(size).keys()]
        .map(() => Math.random() * 2.0 - 1.0)
        .map((v) => complex(v, 0.0))
    );

    // Act
    const fourier = fft2(signal);
    const inverse = ifft2(fourier);

    // Assert
    const sf = signal.flat();
    const iftf = inverse.flat();

    const diff = sf.map((v, i) => abs(sub(v, iftf[i])));
    const closeEnougth = diff.every((v) => v <= 1.0e-5);
    if (!closeEnougth) {
      console.warn("testFft2: Test don't passesd: ", diff);
      return;
    }
  }

  console.log('testFft2: Test passed!');
};
