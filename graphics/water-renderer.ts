import { Geometry, Gpu, ShaderProgram, Texture2d } from './gpu';
import { Camera } from './camera';
import { vs as watervs, fs as waterfs } from './programs/water';
import { mat4 } from 'gl-matrix';

export class WaterRenderer {
  private readonly waterShader: ShaderProgram;

  public constructor(private readonly gpu: Gpu) {
    this.waterShader = this.gpu.createShaderProgram(watervs, waterfs);
  }

  render(
    geometry: Geometry,
    transform: mat4,
    camera: Camera,
    displacementFoamMap: Texture2d,
    normalMap: Texture2d
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
      'displacementFoamMap',
      displacementFoamMap,
      0
    );
    this.gpu.setProgramTexture(this.waterShader, 'normalMap', normalMap, 1);
    // this.gpu.setProgramTexture(this.waterShader, 'foamMap', foamMap, 2);
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
