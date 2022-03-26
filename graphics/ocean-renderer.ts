import { mat4, vec3 } from 'gl-matrix';

import { Geometry, Gpu, ShaderProgram } from './gpu';
import { Camera } from './camera';
import { vs as oceanvs, fs as oceanfs } from './programs/ocean';
import { OceanField } from '../ocean';

export class OceanRenderer {
  private readonly waterShader: ShaderProgram;

  public constructor(private readonly gpu: Gpu) {
    this.waterShader = this.gpu.createShaderProgram(oceanvs, oceanfs);
  }

  render(
    geometry: Geometry,
    transform: mat4,
    camera: Camera,
    oceanField: OceanField
  ) {
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

    this.gpu.drawGeometry(geometry);
  }
}
