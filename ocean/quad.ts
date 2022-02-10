export default {
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
  vertexData: Float32Array.from([-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]),
  indexData: Uint16Array.from([0, 1, 2, 0, 2, 3]),
};
