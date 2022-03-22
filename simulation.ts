import { mat4, vec2, vec3 } from 'gl-matrix';

import {
  Gpu,
  OceanRenderer,
  Camera,
  ArcRotationCameraController,
  GizmoRenderer,
  TextureRenderer,
  TextureType,
  createGrid,
} from './graphics';
import { OceanFieldBuilder, OceanField } from './ocean';

export class Simulation {
  private readonly camera: Camera;
  private readonly controller: ArcRotationCameraController;
  private readonly oceanRenderer: OceanRenderer;
  private readonly gizmoRenderer: GizmoRenderer;
  private readonly textureRenderer: TextureRenderer;

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
  }

  start(field: OceanField, size: number, resolution: number) {
    const geometry = this.createWaterGeometry(size, resolution);
    const grid = this.gpu.createGeometry(
      createGrid(5.0),
      WebGL2RenderingContext.LINES
    );

    this.camera.near = 1.0e-1;
    this.camera.far = 1.0e4;
    this.camera.lookAt(vec3.fromValues(10, 10, -10), vec3.create());

    this.controller.moveSpeed = 2.5;
    this.controller.sync();

    const step = () => {
      const { width, height } = this.gpu.context.canvas;
      field.update(performance.now() / 1e3 + 36000);
      this.controller.update();
      this.gpu.setViewport(0, 0, width, height);
      this.gpu.setRenderTarget(null);
      this.gpu.clearRenderTarget();

      // Water
      const instances = 1;
      for (let i = 0; i < instances; i++) {
        for (let j = 0; j < instances; j++) {
          const transform = mat4.create();
          mat4.fromTranslation(
            transform,
            vec3.fromValues(i * size, 0.0, j * size)
          );
          this.oceanRenderer.render(geometry, transform, this.camera, field);
        }
      }

      // Grid
      this.gizmoRenderer.render(grid, this.camera);

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

      requestAnimationFrame(() => step());
    };

    step();
  }

  private createWaterGeometry(size: number, resolution: number) {
    const vertices: vec3[] = [];
    const indices: number[] = [];
    const N = resolution;
    const L = size;
    const delta = L / (N - 1);
    const offset = vec3.fromValues(-L * 0.5, 0.0, -L * 0.5);

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        let v0 = vec3.fromValues(j * delta, 0.0, i * delta);
        vec3.add(v0, v0, offset);

        let v1 = vec3.fromValues((j + 1) * delta, 0.0, i * delta);
        vec3.add(v1, v1, offset);

        let v2 = vec3.fromValues((j + 1) * delta, 0.0, (i + 1) * delta);
        vec3.add(v2, v2, offset);

        let v3 = vec3.fromValues(j * delta, 0.0, (i + 1) * delta);
        vec3.add(v3, v3, offset);

        indices.push(vertices.length + 1, vertices.length, vertices.length + 2);
        indices.push(vertices.length + 3, vertices.length + 2, vertices.length);

        vertices.push(v0, v1, v2, v3);
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
      ],

      vertexData: Float32Array.from(vertices.map((v) => [...v]).flat()),
      indexData: Uint32Array.from(indices),
    };

    return this.gpu.createGeometry(mesh);
  }
}
