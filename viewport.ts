import { vec3 } from 'gl-matrix';

import {
  Gpu,
  TileOceanRenderer,
  PlateOceanRenderer,
  Camera,
  ArcRotationCameraController,
  GizmoRenderer,
  TextureRenderer,
  createGrid,
  Geometry,
} from './graphics';

import { OceanField } from './ocean';

export class Viewport {
  private readonly camera: Camera;
  private readonly controller: ArcRotationCameraController;
  public readonly tileRenderer: TileOceanRenderer;
  public readonly plateRenderer: PlateOceanRenderer;
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
    this.tileRenderer = new TileOceanRenderer(this.gpu);
    this.plateRenderer = new PlateOceanRenderer(this.gpu);
    this.gizmoRenderer = new GizmoRenderer(this.gpu);
    this.textureRenderer = new TextureRenderer(this.gpu);
    this.grid = this.gpu.createGeometry(
      createGrid(5.0),
      WebGL2RenderingContext.LINES
    );
    this.camera.near = 1.0e-1;
    this.camera.far = 1.0e4;
    this.camera.lookAt(vec3.fromValues(-10, 2.5, -10), vec3.create());
    this.controller.moveSpeed = 2.5;
    this.controller.sync();
  }

  render(field: OceanField, type: 'tile' | 'plate') {
    const { width, height } = this.gpu.context.canvas;
    this.controller.update();
    this.gpu.setViewport(0, 0, width, height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.gizmoRenderer.render(this.grid, this.camera);
    this.renderOcean(field, type);
    this.renderTextures();
  }

  private renderOcean(field: OceanField, type: 'tile' | 'plate') {
    if (type === 'tile') {
      this.tileRenderer.render(this.camera, field);
    } else {
      this.plateRenderer.render(this.camera, field);
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
