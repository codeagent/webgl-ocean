import { mat4, vec3 } from 'gl-matrix';

import {
  Gpu,
  OceanRenderer,
  Camera,
  ArcRotationCameraController,
  GizmoRenderer,
  TextureRenderer,
  createGrid,
  Geometry,
} from './graphics';

import { OceanField } from './ocean';

export interface OceanPatch {
  field: OceanField;
  geometry: Geometry;
  length: number;
}

export class Viewport {
  private readonly camera: Camera;
  private readonly controller: ArcRotationCameraController;
  private readonly oceanRenderer: OceanRenderer;
  private readonly gizmoRenderer: GizmoRenderer;
  private readonly textureRenderer: TextureRenderer;
  private readonly grid: Geometry;

  constructor(private readonly gpu: Gpu) {
    this.camera = new Camera(
      45.0,
      gpu.context.canvas.width / gpu.context.canvas.height,
      0.01,
      100
    );
    this.controller = new ArcRotationCameraController(
      gpu.context.canvas as HTMLCanvasElement,
      this.camera
    );
    this.oceanRenderer = new OceanRenderer(this.gpu);
    this.gizmoRenderer = new GizmoRenderer(this.gpu);
    this.textureRenderer = new TextureRenderer(this.gpu);
    this.grid = this.gpu.createGeometry(
      createGrid(5.0),
      WebGL2RenderingContext.LINES
    );
    this.camera.near = 1.0e-1;
    this.camera.far = 1.0e4;
    this.camera.lookAt(vec3.fromValues(-10, 10, -10), vec3.create());
    this.controller.moveSpeed = 2.5;
    this.controller.sync();
  }

  render(field: OceanField, times: number = 1) {
    const { width, height } = this.gpu.context.canvas;
    field.update(performance.now() / 1e3 + 36000);
    this.controller.update();
    this.gpu.setViewport(0, 0, width, height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.gizmoRenderer.render(this.grid, this.camera);
    this.renderOcean(field, times);
    this.renderTextures();
  }

  private renderOcean(field: OceanField, times: number) {
    for (let i = 0; i < times; i++) {
      for (let j = 0; j < times; j++) {
        const transform = mat4.create();
        mat4.fromTranslation(
          transform,
          vec3.fromValues(i * times, 0.0, j * times)
        );
        this.oceanRenderer.render(transform, this.camera, field);
      }
    }
  }

  private renderTextures() {
    // Noise
    // this.textureRenderer.render(
    //   vec2.fromValues(10, 10),
    //   this.fieldFactory['noiseTexture'].get(params.resolution),
    //   TextureType.Noise
    // );
    // Butterfly
    // this.textureRenderer.render(
    //   vec2.fromValues(10, 100),
    //   this.fieldFactory['butterflyTexture'].get(field.params.resolution),
    //   TextureType.Butterfly
    // );
    // H0
    // this.textureRenderer.render(
    //   vec2.fromValues(10, 200),
    //   field['h0Textures'][0],
    //   TextureType.H0
    // );
    // // H0
    // this.textureRenderer.render(
    //   vec2.fromValues(10, 300),
    //   field['h0Textures'][0],
    //   TextureType.H0_STAR
    // );
    // // Displacement X
    // this.textureRenderer.render(
    //   vec2.fromValues(10, 400),
    //   field.displacementFoam,
    //   TextureType.DX
    // );
    // // Displacement Z
    // this.textureRenderer.render(
    //   vec2.fromValues(10, 500),
    //   field.displacementFoam,
    //   TextureType.DZ
    // );
    // // Normals
    // this.textureRenderer.render(
    //   vec2.fromValues(110, 500),
    //   field.normals,
    //   TextureType.Normals
    // );
    // // Foam
    // this.textureRenderer.render(
    //   vec2.fromValues(210, 500),
    //   field.displacementFoam,
    //   TextureType.Foam
    // );
  }
}
