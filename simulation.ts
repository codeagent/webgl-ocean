import { vec2, vec3 } from 'gl-matrix';

import {
  Gpu,
  WaterRenderer,
  Camera,
  ArcRotationCameraController,
  GizmoRenderer,
  TextureRenderer,
  TextureType,
  createGrid,
} from './graphics';

import {
  DisplacementFieldBuildParams,
  DisplacementFieldFactory,
} from './wave';

export class Simulation {
  private readonly gpu: Gpu;
  private readonly fieldFactory: DisplacementFieldFactory;
  private readonly camera: Camera;
  private readonly controller: ArcRotationCameraController;
  private readonly waterRenderer: WaterRenderer;
  private readonly gizmoRenderer: GizmoRenderer;
  private readonly textureRenderer: TextureRenderer;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.gpu = new Gpu(
      canvas.getContext('webgl2', { preserveDrawingBuffer: true })
    );
    this.fieldFactory = new DisplacementFieldFactory(this.gpu);
    this.camera = new Camera(45.0, canvas.width / canvas.height, 0.01, 100);
    this.controller = new ArcRotationCameraController(this.canvas, this.camera);
    this.waterRenderer = new WaterRenderer(this.gpu);
    this.gizmoRenderer = new GizmoRenderer(this.gpu);
    this.textureRenderer = new TextureRenderer(this.gpu);
  }

  start(params: DisplacementFieldBuildParams) {
    const field = this.fieldFactory.build(params);
    const geometry = this.createWaterGeometry(params);
    const grid = this.gpu.createGeometry(
      createGrid(params.size * 0.5),
      WebGL2RenderingContext.LINES
    );

    this.camera.near = params.size * 1.0e-2;
    this.camera.far = params.size * 1.0e3;
    this.camera.lookAt(
      vec3.fromValues(params.size, params.size, -params.size),
      vec3.create()
    );

    this.controller.moveSpeed = params.size * 0.25;
    this.controller.sync();

    const step = () => {
      field.update(performance.now() / 1e3);
      this.controller.update();
      this.gpu.setViewport(0, 0, this.canvas.width, this.canvas.height);
      this.gpu.setRenderTarget(null);
      this.gpu.clearRenderTarget();

      // Water
      this.waterRenderer.render(
        geometry,
        this.camera,
        field.displacement,
        field.normals,
        field.foam
      );

      // Grid
      this.gizmoRenderer.render(grid, this.camera);

      // Noise
      this.textureRenderer.render(
        vec2.fromValues(10, 10),
        this.fieldFactory['noiseTexture'].get(params.resolution),
        TextureType.Noise
      );

      // Butterfly
      this.textureRenderer.render(
        vec2.fromValues(10, 100),
        this.fieldFactory['butterflyTexture'].get(params.resolution),
        TextureType.Butterfly
      );

      // H0
      this.textureRenderer.render(
        vec2.fromValues(10, 200),
        field['h0Texture'],
        TextureType.H0
      );

      // H0
      this.textureRenderer.render(
        vec2.fromValues(10, 300),
        field['h0Texture'],
        TextureType.H0_STAR
      );

      // Displacement X
      this.textureRenderer.render(
        vec2.fromValues(10, 400),
        field.displacement,
        TextureType.DX
      );

      // Displacement Z
      this.textureRenderer.render(
        vec2.fromValues(10, 500),
        field.displacement,
        TextureType.DZ
      );

      // Normals
      this.textureRenderer.render(
        vec2.fromValues(110, 500),
        field.normals,
        TextureType.Normals
      );

      // Foam
      this.textureRenderer.render(
        vec2.fromValues(210, 500),
        field.foam,
        TextureType.Foam
      );

      requestAnimationFrame(() => step());
    };

    step();
  }

  private createWaterGeometry(params: DisplacementFieldBuildParams) {
    const vertices: vec3[] = [];
    const uvs: vec2[] = [];
    const indices: number[] = [];
    const N = params.geometryResolution;
    const L = params.size;
    const delta = L / (N - 1);
    const offset = vec3.fromValues(-L * 0.5, 0.0, -L * 0.5);

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        let v0 = vec3.fromValues(j * delta, 0.0, i * delta);
        vec3.add(v0, v0, offset);
        let uv0 = vec2.fromValues(j / N, i / N);
        let v1 = vec3.fromValues((j + 1) * delta, 0.0, i * delta);
        vec3.add(v1, v1, offset);
        let uv1 = vec2.fromValues((j + 1) / N, i / N);
        let v2 = vec3.fromValues((j + 1) * delta, 0.0, (i + 1) * delta);
        vec3.add(v2, v2, offset);
        let uv2 = vec2.fromValues((j + 1) / N, (i + 1) / N);
        let v3 = vec3.fromValues(j * delta, 0.0, (i + 1) * delta);
        vec3.add(v3, v3, offset);
        let uv3 = vec2.fromValues(j / N, (i + 1) / N);

        indices.push(vertices.length + 1, vertices.length, vertices.length + 2);
        indices.push(vertices.length + 3, vertices.length + 2, vertices.length);

        vertices.push(v0, v1, v2, v3);
        uvs.push(uv0, uv1, uv2, uv3);
      }
    }

    const mesh = {
      verticesCount: indices.length,
      indicesCount: indices.length,
      vertexFormat: [
        {
          semantics: 'position',
          size: 3,
          type: WebGL2RenderingContext.FLOAT,
          slot: 0,
          offset: 0,
          stride: 12,
        },
        {
          semantics: 'uv',
          size: 2,
          type: WebGL2RenderingContext.FLOAT,
          slot: 1,
          offset: vertices.length * 3 * Float32Array.BYTES_PER_ELEMENT,
          stride: 8,
        },
      ],

      vertexData: Float32Array.from(
        [...vertices, ...uvs].map((v) => [...v]).flat()
      ),
      indexData: Uint32Array.from(indices),
    };

    return this.gpu.createGeometry(mesh);
  }
}
