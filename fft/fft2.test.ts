import { abs, add, mult, Complex, complex, sub } from './complex';
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

export const testFft2Hermitian = () => {
  const I = complex(0.0, 1.0);

  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const signal0: Complex[][] = [...Array(size).keys()].map(() =>
      [...Array(size).keys()]
        .map(() => Math.random() * 2.0 - 1.0)
        .map((v) => complex(v, 0.0))
    );
    const signal1: Complex[][] = [...Array(size).keys()].map(() =>
      [...Array(size).keys()]
        .map(() => Math.random() * 2.0 - 1.0)
        .map((v) => complex(v, 0.0))
    );

    // Act
    const spectrum0 = fft2(signal0);
    const spectrum1 = fft2(signal1);
    const combined: Complex[][] = [];
    for (let i = 0; i < size; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < size; j++) {
        row.push(add(spectrum0[i][j], mult(I, spectrum1[i][j])));
      }
      combined.push(row);
    }

    const inverse = ifft2(combined);

    // Assert
    const s0f = signal0.flat(2).filter((v) => v !== 0.0);
    const s1f = signal1.flat(2).filter((v) => v !== 0.0);
    const ifftf = inverse.flat();

    const diff = ifftf.map((v, i) => abs(sub(v, complex(s0f[i], s1f[i]))));
    const closeEnougth = diff.every((v) => v <= 1.0e-5);
    if (!closeEnougth) {
      console.warn("testFft2Hermitian: Test don't passesd: ", diff);
      return;
    }
  }

  console.log('testFft2Hermitian: Test passed!');
};
