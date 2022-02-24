import { Mesh } from './gpu';

const PRIMARY = [0.5, 0.5, 0.5];
const SECONDARY = [0.25, 0.25, 0.25];

export const createGrid = (): Mesh => {
  const STEP = 5.0;
  const UINT = 1.0;
  const EXPANSION = 10;

  let u = 0;
  let vertices = [];
  let indices = [];

  for (let e = 0.0; e <= EXPANSION; e += UINT) {
    if (u == 0) {
      indices.push(indices.length);
      vertices.push(-EXPANSION, 0.0, 0.0, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(EXPANSION, 0.0, 0.0, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, -EXPANSION, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, EXPANSION, ...PRIMARY);
    } else {
      const color = u % STEP == 0 ? PRIMARY : SECONDARY;
      indices.push(indices.length);
      vertices.push(-EXPANSION, 0.0, e, ...color);
      indices.push(indices.length);
      vertices.push(EXPANSION, 0.0, e, ...color);
      indices.push(indices.length);
      vertices.push(-EXPANSION, 0.0, -e, ...color);
      indices.push(indices.length);
      vertices.push(EXPANSION, 0.0, -e, ...color);

      indices.push(indices.length);
      vertices.push(e, 0.0, -EXPANSION, ...color);
      indices.push(indices.length);
      vertices.push(e, 0.0, EXPANSION, ...color);
      indices.push(indices.length);
      vertices.push(-e, 0.0, -EXPANSION, ...color);
      indices.push(indices.length);
      vertices.push(-e, 0.0, EXPANSION, ...color);
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
        slot: 1,
        offset: 12,
        stride: 24,
      },
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint16Array.from(indices),
  };
};
