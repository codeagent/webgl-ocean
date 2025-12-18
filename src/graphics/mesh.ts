import { vec3 } from 'gl-matrix';
import { Mesh } from './gpu';

export function createQuad(): Mesh {
  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 20,
      },
      {
        semantics: 'uv',
        size: 2,
        type: WebGL2RenderingContext.FLOAT,
        slot: 1,
        offset: 12,
        stride: 20,
      },
    ],
    vertexData: Float32Array.of(
      -1,
      -1,
      0,
      0.0,
      0.0,
      1,
      -1,
      0,
      1.0,
      0.0,
      1,
      1,
      0,
      1.0,
      1.0,
      -1,
      1,
      0,
      0.0,
      1.0
    ),
    indexData: Uint32Array.of(0, 1, 2, 0, 2, 3),
  };
}

export function createPlane(
  resolution: number,
  scale: number,
  wired = false
): Mesh {
  const vertices: vec3[] = [];
  const indices: number[] = [];
  const N = resolution;
  const SKIRT = -0.5;
  const L = scale;
  const delta = L / (N - 1);
  const offset = vec3.fromValues(-L * 0.5, 0.0, -L * 0.5);

  for (let i = 0; i <= N + 1; i++) {
    for (let j = 0; j <= N + 1; j++) {
      const y = i == 0 || j == 0 || i == N + 1 || j == N + 1 ? SKIRT : 0.0;
      let vertex: vec3 = vec3.fromValues(j * delta, y, i * delta);

      vec3.add(vertex, vertex, offset);

      if (i > 0 && j > 0) {
        if (wired) {
          indices.push(
            vertices.length,
            vertices.length - N - 2,
            vertices.length,
            vertices.length - 1
          );
        } else {
          indices.push(
            // first
            vertices.length,
            vertices.length - N - 3,
            vertices.length - 1,
            // second
            vertices.length,
            vertices.length - N - 2,
            vertices.length - N - 3
          );
        }
      }

      vertices.push(vertex);
    }
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 12,
      },
    ],

    vertexData: Float32Array.from(vertices.map((v) => [...v]).flat()),
    indexData: Uint32Array.from(indices),
  };
}

export function createGrid(expansion: number = 10.0): Mesh {
  const PRIMARY = [1.0, 1.0, 1.0];
  const XAXIS = [1.0, 0.0, 0.0];
  const ZAXIS = [0.0, 0.0, 1.0];
  const SECONDARY = [0.55, 0.55, 0.55];
  const STEP = expansion / 2;
  const UINT = expansion / 5;

  let u = 0;
  let vertices = [];
  let indices = [];

  for (let e = 0.0; e <= expansion; e += UINT) {
    if (u == 0) {
      indices.push(indices.length);
      vertices.push(-expansion, 0.0, 0.0, ...XAXIS);

      indices.push(indices.length);
      vertices.push(expansion, 0.0, 0.0, ...XAXIS);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, -expansion, ...ZAXIS);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, expansion, ...ZAXIS);
    } else {
      const color = u % STEP == 0 ? PRIMARY : SECONDARY;
      indices.push(indices.length);
      vertices.push(-expansion, 0.0, e, ...color);
      indices.push(indices.length);
      vertices.push(expansion, 0.0, e, ...color);
      indices.push(indices.length);
      vertices.push(-expansion, 0.0, -e, ...color);
      indices.push(indices.length);
      vertices.push(expansion, 0.0, -e, ...color);

      indices.push(indices.length);
      vertices.push(e, 0.0, -expansion, ...color);
      indices.push(indices.length);
      vertices.push(e, 0.0, expansion, ...color);
      indices.push(indices.length);
      vertices.push(-e, 0.0, -expansion, ...color);
      indices.push(indices.length);
      vertices.push(-e, 0.0, expansion, ...color);
    }
    u++;
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 24,
      },
      {
        semantics: 'color',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 2,
        offset: 12,
        stride: 24,
      },
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint32Array.from(indices),
  };
}

export function createCube(): Mesh {
  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 24,
      },
      {
        semantics: 'normal',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 1,
        offset: 12,
        stride: 24,
      },
    ],
    vertexData: Float32Array.from([
      -0.5, -0.5, 0.5, 0, -1, 0, -0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, -0.5, 0,
      -1, 0, 0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, 0.5, 0, -1, 0, -0.5, -0.5,
      0.5, 0, -1, 0, -0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5,
      -0.5, 0, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0, -0.5, 0.5, -0.5, 0, 1, 0, -0.5,
      0.5, 0.5, 0, 1, 0, -0.5, -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0.5, 0, 0, 1, 0.5,
      0.5, 0.5, 0, 0, 1, 0.5, 0.5, 0.5, 0, 0, 1, -0.5, 0.5, 0.5, 0, 0, 1, -0.5,
      -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0.5, 1, 0, 0, 0.5, -0.5, -0.5, 1, 0, 0,
      0.5, 0.5, -0.5, 1, 0, 0, 0.5, 0.5, -0.5, 1, 0, 0, 0.5, 0.5, 0.5, 1, 0, 0,
      0.5, -0.5, 0.5, 1, 0, 0, 0.5, -0.5, -0.5, 0, 0, -1, -0.5, -0.5, -0.5, 0,
      0, -1, -0.5, 0.5, -0.5, 0, 0, -1, -0.5, 0.5, -0.5, 0, 0, -1, 0.5, 0.5,
      -0.5, 0, 0, -1, 0.5, -0.5, -0.5, 0, 0, -1, -0.5, -0.5, -0.5, -1, 0, 0,
      -0.5, -0.5, 0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1,
      0, 0, -0.5, 0.5, -0.5, -1, 0, 0, -0.5, -0.5, -0.5, -1, 0, 0,
    ]),
    indexData: Uint32Array.from([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    ]),
  };
}
