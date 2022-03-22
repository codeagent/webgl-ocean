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
    this.gpu.setProgramVariable(
      this.waterShader,
      'croppiness',
      'float',
      oceanField.params.croppiness
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'size',
      'float',
      oceanField.params.size
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'scales',
      'vec3',
      vec3.fromValues(
        1.0 / oceanField.params.scales[0],
        1.0 / oceanField.params.scales[1],
        1.0 / oceanField.params.scales[2]
      )
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
