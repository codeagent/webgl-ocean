import { vec2, vec3 } from 'gl-matrix';
import { animationFrames } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';

import { CameraControllerInterface } from './controller';
import { Gpu, Gizmos } from './graphics';
import { OceanField, OceanFieldSampler } from './ocean';
import {
  PlateOceanRenderer,
  ProjectedGridRenderer,
  TileOceanRenderer,
} from './renderer';

export class Viewport {
  public readonly tileRenderer: TileOceanRenderer;
  public readonly plateRenderer: PlateOceanRenderer;
  public readonly projectedGridRenderer: ProjectedGridRenderer;
  private readonly gizmos: Gizmos;

  private lastFrameTime: number = 0;
  private readonly pointSample = vec3.create();
  private patchSample: vec3[] = [];

  constructor(
    private readonly gpu: Gpu,
    private readonly oceanField: OceanField,
    private readonly oceanSampler: OceanFieldSampler,
    private readonly cameraController: CameraControllerInterface
  ) {
    this.tileRenderer = new TileOceanRenderer(this.gpu);
    this.plateRenderer = new PlateOceanRenderer(this.gpu);
    this.projectedGridRenderer = new ProjectedGridRenderer(this.gpu);
    this.gizmos = new Gizmos(this.gpu);

    animationFrames()
      .pipe(
        exhaustMap(() => this.oceanSampler.samplePoint(vec2.fromValues(5, 5)))
      )
      .subscribe((e) => vec3.copy(this.pointSample, e));

    animationFrames()
      .pipe(
        exhaustMap(() =>
          this.oceanSampler.samplePatch(vec2.fromValues(12.0, 12.0), 5)
        )
      )
      .subscribe((e) => (this.patchSample = e));
  }

  render(type: 'tile' | 'plate' | 'grid') {
    const { width, height } = this.gpu.context.canvas;
    const t = performance.now();
    this.cameraController.update((t - this.lastFrameTime) * 1.0e-3);
    this.gpu.setViewport(0, 0, width, height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.renderOcean(this.oceanField, type);
    this.gizmos.drawGrid(this.cameraController.camera);
    this.gizmos.drawPointSample(this.cameraController.camera, this.pointSample);
    this.gizmos.drawPatchSample(this.cameraController.camera, this.patchSample);

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
}
