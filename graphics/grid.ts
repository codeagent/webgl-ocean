import { Mesh } from './gpu';

const PRIMARY = [0.95, 0.95, 0.95];
const SECONDARY = [0.75, 0.75, 0.75];

export const createGrid = (expansion: number = 10.0): Mesh => {
  const STEP = expansion / 2;
  const UINT = expansion / 10;
  

  let u = 0;
  let vertices = [];
  let indices = [];

  for (let e = 0.0; e <= expansion; e += UINT) {
    if (u == 0) {
      indices.push(indices.length);
      vertices.push(-expansion, 0.0, 0.0, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(expansion, 0.0, 0.0, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, -expansion, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, expansion, ...PRIMARY);
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
        slot: 1,
        offset: 12,
        stride: 24,
      },
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint32Array.from(indices),
  };
};
