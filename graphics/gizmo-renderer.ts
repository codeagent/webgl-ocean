import { Geometry, Gpu, ShaderProgram } from './gpu';
import { Camera } from './camera';
import { vs, fs } from './programs/gizmo';

export class GizmoRenderer {
  private readonly gizmoShader: ShaderProgram;

  public constructor(private readonly gpu: Gpu) {
    this.gizmoShader = this.gpu.createShaderProgram(vs, fs);
  }

  render(geometry: Geometry, camera: Camera) {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
      
    );

    this.gpu.setProgram(this.gizmoShader);
    this.gpu.setProgramVariable(
      this.gizmoShader,
      'viewMat',
      'mat4',
      camera.view
    );
    this.gpu.setProgramVariable(
      this.gizmoShader,
      'projMat',
      'mat4',
      camera.projection
    );

    this.gpu.drawGeometry(geometry);
  }
}
