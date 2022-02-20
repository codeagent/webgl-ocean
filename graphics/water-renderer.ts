import { Geometry, Gpu, ShaderProgram } from './gpu';
import { DisplacementField } from '../wave';
import { Camera } from './camera';
import { vs as watervs, fs as waterfs } from './programs/water';

export class WaterRenderer {
  private readonly waterShader: ShaderProgram;

  public constructor(private readonly gpu: Gpu) {
    this.waterShader = this.gpu.createShaderProgram(watervs, waterfs);
  }

  render(
    geometry: Geometry,
    displacementField: DisplacementField,
    camera: Camera
  ) {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );

    this.gpu.setProgram(this.waterShader);
    this.gpu.setProgramTexture(
      this.waterShader,
      'displacementMap',
      displacementField.displacement,
      0
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
      'pos',
      'vec3',
      camera.position
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'delta',
      'float',
      displacementField.params.size /
        (displacementField.params.subdivisions - 1)
    );
    this.gpu.setProgramVariable(
      this.waterShader,
      'croppiness',
      'float',
      displacementField.params.croppiness
    );

    this.gpu.drawGeometry(geometry);
  }
}
