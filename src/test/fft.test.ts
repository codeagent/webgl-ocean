import {
  complex,
  fft,
  ifft,
  createButterflyTexture,
  fft2,
  ifft2,
  fft2Butterfly,
  ifft2Butterfly,
} from '../fft/fft';
import { areCloseEnough, getDiff } from './utils';

export const testFft = () => {
  for (let pow of [1,2,3,4,5,6,7]) {
    // Arrange
    const size = 1 << pow;
    const signal = Array.from(new Array(size), () =>
      complex(Math.random() * 2.0 - 1.0, 0)
    );

    // Act
    const fourier = fft(signal);
    const inverse = ifft(fourier);

    // Assert
    if (!areCloseEnough(signal, inverse)) {
      console.warn("testFft: Test didn't pass: ", getDiff(signal, inverse));
      return false;
    }
  }

  console.log('testFft: Test passed!');

  return true;
};

export const testFft2 = () => {
  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const signal = Array.from(new Array(size), () =>
      Array.from(new Array(size), () => complex(Math.random() * 2.0 - 1.0, 0))
    );

    // Act
    const fourier = fft2(signal);
    const inverse = ifft2(fourier);

    // Assert
    if (!areCloseEnough(signal.flat(1), inverse.flat(1))) {
      console.warn(
        "testFft2: Test didn't pass: ",
        getDiff(signal.flat(1), inverse.flat(1))
      );
      return false;
    }
  }

  console.log('testFft2: Test passed!');

  return true;
};

export const testButterfly = () => {
  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const signal = Array.from(new Array(size), () =>
      Array.from(new Array(size), () => complex(Math.random() * 2.0 - 1.0, 0))
    );
    const transform = Array.from(new Array(size), () =>
      Array.from(new Array(size), () => complex(0, 0))
    );
    const butterfly = createButterflyTexture(size);

    // Act
    const fourierFft = fft2(signal);
    fft2Butterfly(transform, signal, butterfly);

    // Assert
    if (!areCloseEnough(fourierFft.flat(1), transform.flat(1))) {
      console.warn(
        "testButterfly: Test didn't pass: ",
        getDiff(fourierFft.flat(1), transform.flat(1))
      );
      return false;
    }
  }

  for (let pow of [1, 2, 3, 4, 5, 6, 7, 8]) {
    // Arrange
    const size = 1 << pow;
    const fourier = Array.from(new Array(size), () =>
      Array.from(new Array(size), () =>
        complex(Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0)
      )
    );
    const transform = Array.from(new Array(size), () =>
      Array.from(new Array(size), () => complex(0, 0))
    );
    const butterfly = createButterflyTexture(size, true);

    // Act
    const signal = ifft2(fourier);
    ifft2Butterfly(transform, fourier, butterfly);

    // Assert
    if (!areCloseEnough(signal.flat(1), transform.flat(1))) {
      console.warn(
        "testButterfly: Test didn't pass: ",
        getDiff(signal.flat(1), transform.flat(1))
      );
      return false;
    }
  }

  console.log('testButterfly: Test passed!');

  return true;
};
