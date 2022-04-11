import { CameraControllerInterface } from './controller';
import {
  Gpu,
  TileOceanRenderer,
  PlateOceanRenderer,
  Camera,
  GizmoRenderer,
  TextureRenderer,
  createGrid,
  Geometry,
  ProjectedGridRenderer,
} from './graphics';
import { OceanField } from './ocean';

export class Viewport {
  public readonly tileRenderer: TileOceanRenderer;
  public readonly plateRenderer: PlateOceanRenderer;
  public readonly projectedGridRenderer: ProjectedGridRenderer;
  private readonly gizmoRenderer: GizmoRenderer;
  private readonly textureRenderer: TextureRenderer;
  private readonly grid: Geometry;

  private lastFrameTime: number = 0;

  constructor(
    private readonly gpu: Gpu,
    private readonly cameraController: CameraControllerInterface
  ) {
    this.tileRenderer = new TileOceanRenderer(this.gpu);
    this.plateRenderer = new PlateOceanRenderer(this.gpu);
    this.projectedGridRenderer = new ProjectedGridRenderer(this.gpu);
    this.gizmoRenderer = new GizmoRenderer(this.gpu);
    this.textureRenderer = new TextureRenderer(this.gpu);
    this.grid = this.gpu.createGeometry(
      createGrid(5.0),
      WebGL2RenderingContext.LINES
    );
  }

  render(field: OceanField, type: 'tile' | 'plate' | 'grid') {
    const { width, height } = this.gpu.context.canvas;
    const t = performance.now();
    this.cameraController.update((t - this.lastFrameTime) * 1.0e-3);
    this.gpu.setViewport(0, 0, width, height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.gizmoRenderer.render(this.grid, this.cameraController.camera);
    this.renderOcean(field, type);
    this.renderTextures();
    this.lastFrameTime = t;
  }

  private renderOcean(field: OceanField, type: 'tile' | 'plate' | 'grid') {
    if (type === 'tile') {
      this.tileRenderer.render(this.cameraController.camera, field);
    } else if (type === 'grid') {
      this.projectedGridRenderer.render(this.cameraController.camera, field);
    } else {
      this.plateRenderer.render(this.cameraController.camera, field);
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
