import { vec2, vec3 } from 'gl-matrix';
import { animationFrames } from 'rxjs';
import { exhaustMap, retry } from 'rxjs/operators';

import { createCube, createCylinder, createDonut, createDuck } from './bodies';
import { CameraControllerInterface } from './controller';
import { Gpu, Gizmos, Geometry } from './graphics';
import { Cubemap } from './graphics/gpu';
import {
  OceanField,
  OceanFieldBuoyancy,
  FloatingBody,
  PatchSampler,
  PointsSampler,
} from './ocean';
import { World } from './physics';
import {
  PlateOceanRenderer,
  ProjectedGridRenderer,
  QuadTreeOceanRenderer,
  SkyboxRenderer,
  TileOceanRenderer,
} from './renderer';

export class Viewport {
  public readonly tileRenderer: TileOceanRenderer;
  public readonly plateRenderer: PlateOceanRenderer;
  public readonly projectedGridRenderer: ProjectedGridRenderer;
  public readonly quadTreeRenderer: QuadTreeOceanRenderer;
  public readonly skyboxRenderer: SkyboxRenderer;
  private readonly gizmos: Gizmos;
  private readonly pointSampler: PointsSampler;
  private readonly patchSampler: PatchSampler;
  private pointSamples: vec3[] = [];
  private patchSample: vec3[] = [];
  private readonly floaters: [FloatingBody, Geometry][] = [];

  constructor(
    private readonly gpu: Gpu,
    private readonly oceanField: OceanField,
    private readonly world: World,
    private readonly buoyancy: OceanFieldBuoyancy,
    private readonly cameraController: CameraControllerInterface,
    private readonly skybox: Cubemap
  ) {
    this.tileRenderer = new TileOceanRenderer(this.gpu);
    this.plateRenderer = new PlateOceanRenderer(this.gpu);
    this.projectedGridRenderer = new ProjectedGridRenderer(this.gpu);
    this.quadTreeRenderer = new QuadTreeOceanRenderer(this.gpu);
    this.skyboxRenderer = new SkyboxRenderer(this.gpu);
    this.gizmos = new Gizmos(this.gpu);

    this.floaters = [
      createCube(this.world, this.buoyancy),
      createCylinder(this.world, this.buoyancy),
      createDuck(this.world, this.buoyancy),
      createDonut(this.world, this.buoyancy),
    ];

    this.pointSampler = new PointsSampler(this.oceanField, 3);
    this.patchSampler = new PatchSampler(this.oceanField, 4);

    animationFrames()
      .pipe(
        exhaustMap(() =>
          this.pointSampler.sampleAsync(
            vec2.fromValues(7, 10),
            vec2.fromValues(7, 12),
            vec2.fromValues(7, 14)
          )
        ),
        retry()
      )
      .subscribe((e) => (this.pointSamples = e));

    animationFrames()
      .pipe(
        exhaustMap(() =>
          this.patchSampler.sampleAsync(vec2.fromValues(12.0, 12.0), 5)
        ),
        retry()
      )
      .subscribe((e) => (this.patchSample = e));
  }

  render(type: 'tile' | 'plate' | 'grid' | 'quad-tree') {
    const { width, height } = this.gpu.context.canvas;

    this.gpu.setViewport(0, 0, width, height);
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.renderSkybox();
    this.renderGrid();
    this.renderOcean(this.oceanField, type);
    this.renderFloatings();
  }

  private renderSkybox() {
    this.skyboxRenderer.render(this.cameraController.camera, this.skybox);
  }

  private renderGrid() {
    this.gizmos.drawGrid(this.cameraController.camera);
  }

  private renderFloatings() {
    this.floaters.forEach(([floater, geometry]) =>
      this.gizmos.drawFloatingBody(
        this.cameraController.camera,
        floater,
        this.buoyancy,
        geometry
      )
    );
    this.pointSamples.forEach((s) =>
      this.gizmos.drawSphere(this.cameraController.camera, s, 0.2)
    );
    this.gizmos.drawPatch(this.cameraController.camera, this.patchSample);
  }

  private renderOcean(
    field: OceanField,
    type: 'tile' | 'plate' | 'grid' | 'quad-tree'
  ) {
    if (type === 'tile') {
      this.tileRenderer.render(
        this.cameraController.camera,
        field,
        this.skybox
      );
    } else if (type === 'grid') {
      this.projectedGridRenderer.render(
        this.cameraController.camera,
        field,
        this.skybox
      );
    } else if (type === 'quad-tree') {
      this.quadTreeRenderer.render(
        this.cameraController.camera,
        field,
        this.skybox
      );
    } else {
      this.plateRenderer.render(
        this.cameraController.camera,
        field,
        this.skybox
      );
    }
  }
}
