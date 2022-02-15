import { vec2, vec3 } from 'gl-matrix';
import { Geometry, Gpu, ShaderProgram } from '../ocean/gpu';
import { HeightField } from '../ocean/height-field';
import { Camera } from './camera';
import { vs as watervs, fs as waterfs } from './programs/water';

export class Viewport {
  private readonly gpu: Gpu = Gpu.instance;
  private readonly waterShader: ShaderProgram;
  private readonly water: Geometry;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly heightField: HeightField
  ) {
    this.waterShader = this.gpu.createShaderProgram(watervs, waterfs);
    this.water = this.createWaterGeometry();
  }

  render() {
    this.gpu.setDimensions(this.canvas.width, this.canvas.height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();
    this.gpu.setProgram(this.waterShader);
    this.gpu.setProgramTexture(
      this.waterShader,
      'heightField',
      this.heightField.heightTexture,
      0
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'viewMat',
      'mat4',
      this.camera.view
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'projMat',
      'mat4',
      this.camera.projection
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'pos',
      'vec3',
      this.camera.position
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'delta',
      'float',
      this.heightField.params.size / (this.heightField.params.subdivisions - 1)
    );

    this.gpu.drawGeometry(this.water);
  }

  private createWaterGeometry() {
    const vertices: vec3[] = [];
    const ids: vec2[] = [];
    const indices: number[] = [];
    const N = this.heightField.params.subdivisions;
    const L = this.heightField.params.size;
    const delta = L / (N - 1);

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        let v0 = vec3.fromValues(j * delta, 0.0, i * delta);
        let id0 = vec2.fromValues(j, i);
        let v1 = vec3.fromValues((j + 1) * delta, 0.0, i * delta);
        let id1 = vec2.fromValues(j + 1, i);
        let v2 = vec3.fromValues((j + 1) * delta, 0.0, (i + 1) * delta);
        let id2 = vec2.fromValues(j + 1, i + 1);
        let v3 = vec3.fromValues(j * delta, 0.0, (i + 1) * delta);
        let id3 = vec2.fromValues(j, i + 1);

        indices.push(vertices.length, vertices.length + 1, vertices.length + 2);
        indices.push(vertices.length + 2, vertices.length + 3, vertices.length);

        vertices.push(v0, v1, v2, v3);
        ids.push(id0, id1, id2, id3);
      }
    }

    const mesh = {
      verticesCount: indices.length,
      indicesCount: indices.length,
      vertexFormat: [
        {
          semantics: 'position',
          size: 3,
          type: WebGL2RenderingContext.FLOAT,
          slot: 0,
          offset: 0,
          stride: 12,
        },
        {
          semantics: 'id',
          size: 2,
          type: WebGL2RenderingContext.FLOAT,
          slot: 1,
          offset: vertices.length * 3 * Float32Array.BYTES_PER_ELEMENT,
          stride: 8,
        },
      ],

      vertexData: Float32Array.from(
        [...vertices, ...ids].map((v) => [...v]).flat()
      ),
      indexData: Uint32Array.from(indices),
    };

    console.log(mesh.indexData.length);

    return this.gpu.createGeometry(mesh);
  }
}
