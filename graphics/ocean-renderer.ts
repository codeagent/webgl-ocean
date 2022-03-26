import { mat4, vec3 } from 'gl-matrix';

import { Geometry, Gpu, ShaderProgram } from './gpu';
import { Camera } from './camera';
import { vs as oceanvs, fs as oceanfs } from './programs/ocean';
import { OceanField } from '../ocean';

export class OceanRenderer {
  public get geometryResolution(): number {
    return this._geometryResolution;
  }

  public set geometryResolution(geometryResolution: number) {
    if (geometryResolution !== this._geometryResolution) {
      this.gpu.destroyGeometry(this.oceanGeometry);
      this.oceanGeometry = this.createOceanGeometry(
        this.geometrySize,
        geometryResolution
      );
      this._geometryResolution = geometryResolution;
    }
  }

  public get geometrySize(): number {
    return this._geometrySize;
  }

  public set geometrySize(geometrySize: number) {
    if (geometrySize !== this._geometrySize) {
      this.gpu.destroyGeometry(this.oceanGeometry);
      this.oceanGeometry = this.createOceanGeometry(
        geometrySize,
        this.geometryResolution
      );
      this._geometrySize = geometrySize;
    }
  }

  private readonly waterShader: ShaderProgram;
  private _geometryResolution: number = 256;
  private _geometrySize: number = 100.0;
  private oceanGeometry: Geometry;

  public constructor(private readonly gpu: Gpu) {
    this.waterShader = this.gpu.createShaderProgram(oceanvs, oceanfs);
    this.oceanGeometry = this.createOceanGeometry(
      this.geometrySize,
      this.geometryResolution
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

  private createOceanGeometry(size: number, resolution: number) {
    const vertices: vec3[] = [];
    const indices: number[] = [];
    const N = resolution;
    const L = size;
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
