import {
  Geometry,
  Gpu,
  ShaderProgram,
  Camera,
  Cubemap,
  createCube,
} from '../graphics';
import { vs, fs } from '../programs/skybox.glsl';

export class SkyboxRenderer {
  private readonly program: ShaderProgram;
  private readonly geometry: Geometry;

  public constructor(private readonly gpu: Gpu) {
    this.program = this.gpu.createShaderProgram(vs, fs);
    this.geometry = this.createGeometry();
  }

  render(camera: Camera, skybox: Cubemap) {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );
    this.gpu.setProgram(this.program);
    this.gpu.setProgramCubemap(this.program, 'env', skybox, 0);
    this.gpu.setProgramVariable(this.program, 'viewMat', 'mat4', camera.view);
    this.gpu.setProgramVariable(
      this.program,
      'projMat',
      'mat4',
      camera.projection
    );

    this.gpu.setCullFace(WebGL2RenderingContext.CW);
    this.gpu.enableDepthWrite(false);
    this.gpu.drawGeometry(this.geometry);
    this.gpu.enableDepthWrite(true);
    this.gpu.setCullFace(WebGL2RenderingContext.CCW);
  }

  dispose() {
    this.gpu.destroyGeometry(this.geometry);
    this.gpu.destroyProgram(this.program);
  }

  private createGeometry() {
    return this.gpu.createGeometry(createCube());
  }

}
