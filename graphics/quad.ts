export default {
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
  vertexData: Float32Array.from([
    -1, -1, 1, 0.0, 0.0, 1, -1, 1, 1.0, 0.0, 1, 1, 1, 1.0, 1.0, -1, 1, 1, 0.0,
    1.0,
  ]),
  indexData: Uint32Array.from([0, 1, 2, 0, 2, 3]),
};
