import { mat4, vec3 } from 'gl-matrix';

import { Geometry, Gpu, ShaderProgram } from './gpu';
import { Camera } from './camera';
import { vs as oceanvs, fs as oceanfs } from './programs/ocean';
import { OceanField } from '../ocean';

export class OceanRenderer {
  private readonly geometry = new Map<number, Geometry>();

  public get geometryResolution(): number {
    return this._geometryResolution;
  }

  public set geometryResolution(geometryResolution: number) {
    if (!this.geometry.has(geometryResolution)) {
      const geometry = this.createOceanGeometry(geometryResolution);
      this.geometry.set(geometryResolution, geometry);
    }
    this.oceanGeometry = this.geometry.get(geometryResolution);
    this._geometryResolution = geometryResolution;
  }

  public geometrySize: number = 100.0;

  private readonly waterShader: ShaderProgram;
  private _geometryResolution: number = 256;
  private oceanGeometry: Geometry;

  public constructor(private readonly gpu: Gpu) {
    this.waterShader = this.gpu.createShaderProgram(oceanvs, oceanfs);
    this.geometry.set(
      this._geometryResolution,
      (this.oceanGeometry = this.createOceanGeometry(this._geometryResolution))
    );
  }

  render(transform: mat4, camera: Camera, oceanField: OceanField) {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );
    this.gpu.setProgram(this.waterShader);
    this.gpu.setProgramTextures(
      this.waterShader,
      [
        'dx_hy_dz_dxdz0',
        'sx_sz_dxdx_dzdz0',
        'dx_hy_dz_dxdz1',
        'sx_sz_dxdx_dzdz1',
        'dx_hy_dz_dxdz2',
        'sx_sz_dxdx_dzdz2',
      ],
      oceanField.dataMaps
    );

    for (let i = 0; i < oceanField.params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.waterShader,
        `sizes[${i}]`,
        'float',
        oceanField.params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        this.waterShader,
        `croppinesses[${i}]`,
        'float',
        oceanField.params.cascades[i].croppiness
      );
    }

    this.gpu.setProgramVariable(
      this.waterShader,
      'geometrySize',
      'float',
      this.geometrySize
    );

    this.gpu.setProgramVariable(
      this.waterShader,
      'foamSpreading',
      'float',
      oceanField.params.foamSpreading
    );

    this.gpu.setProgramVariable(
      this.waterShader,
      'foamContrast',
      'float',
      oceanField.params.foamContrast
    );

    this.gpu.setProgramVariable(
      this.waterShader,
      'viewMat',
      'mat4',
      camera.view
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'projMat',
      'mat4',
      camera.projection
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'worldMat',
      'mat4',
      transform
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'pos',
      'vec3',
      camera.position
    );

    this.gpu.drawGeometry(this.oceanGeometry);
  }

  private createOceanGeometry(resolution: number) {
    const vertices: vec3[] = [];
    const indices: number[] = [];
    const N = resolution;
    const L = 1.0;
    const delta = L / (N - 1);
    const offset = vec3.fromValues(-L * 0.5, 0.0, -L * 0.5);

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        let v0 = vec3.fromValues(j * delta, 0.0, i * delta);
        vec3.add(v0, v0, offset);

        let v1 = vec3.fromValues((j + 1) * delta, 0.0, i * delta);
        vec3.add(v1, v1, offset);

        let v2 = vec3.fromValues((j + 1) * delta, 0.0, (i + 1) * delta);
        vec3.add(v2, v2, offset);

        let v3 = vec3.fromValues(j * delta, 0.0, (i + 1) * delta);
        vec3.add(v3, v3, offset);

        indices.push(vertices.length + 1, vertices.length, vertices.length + 2);
        indices.push(vertices.length + 3, vertices.length + 2, vertices.length);

        vertices.push(v0, v1, v2, v3);
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
      ],

      vertexData: Float32Array.from(vertices.map((v) => [...v]).flat()),
      indexData: Uint32Array.from(indices),
    };

    return this.gpu.createGeometry(mesh);
  }
}
