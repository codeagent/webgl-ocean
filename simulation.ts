import { vec2, vec3 } from 'gl-matrix';

import {
  Gpu,
  WaterRenderer,
  Camera,
  ArcRotationCameraController,
} from './graphics';
import { TextureRenderer, TextureType } from './graphics/texture-renderer';
import {
  DisplacementFieldBuildParams,
  DisplacementFieldFactory,
} from './wave/displacement-field-factory';

export class Simulation {
  private readonly gpu: Gpu;
  private readonly fieldFactory: DisplacementFieldFactory;
  private readonly camera: Camera;
  private readonly controller: ArcRotationCameraController;
  private readonly waterRenderer: WaterRenderer;
  private readonly textureRenderer: TextureRenderer;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.gpu = new Gpu(canvas.getContext('webgl2'));
    this.fieldFactory = new DisplacementFieldFactory(this.gpu);
    this.camera = new Camera(45.0, canvas.width / canvas.height, 0.01, 100);
    this.controller = new ArcRotationCameraController(this.canvas, this.camera);
    this.waterRenderer = new WaterRenderer(this.gpu);
    this.textureRenderer = new TextureRenderer(this.gpu);
  }

  start(params: DisplacementFieldBuildParams) {
    const field = this.fieldFactory.build(params);
    const geometry = this.createWaterGeometry(params);

    this.camera.near = field.params.size * 1.0e-2;
    this.camera.far = field.params.size * 1.0e3;
    this.camera.lookAt(
      vec3.fromValues(field.params.size, field.params.size, 0),
      vec3.create()
    );

    this.controller.moveSpeed = field.params.size * 0.25;
    this.controller.sync();

    const step = () => {
      field.update(performance.now() / 1000);
      this.controller.update();
      this.gpu.setRenderTarget(null);
      this.gpu.clearRenderTarget();

      // Water
      this.waterRenderer.render(geometry, field, this.camera);

      // Noise
      this.textureRenderer.render(
        vec2.fromValues(10, 10),
        this.fieldFactory['noiseTexture'].get(params.subdivisions),
        TextureType.Noise
      );

      // Butterfly
      this.textureRenderer.render(
        vec2.fromValues(10, 100),
        this.fieldFactory['butterflyTexture'].get(params.subdivisions),
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

      /**
       * @todo:
       */
      // HK
      this.textureRenderer.render(
        vec2.fromValues(10, 400),
        field['hkTexture'],
        TextureType.Hk
      );

      // Displacement X
      this.textureRenderer.render(
        vec2.fromValues(10, 500),
        field.displacement,
        TextureType.DX
      );

      // Displacement Z
      this.textureRenderer.render(
        vec2.fromValues(100, 500),
        field.displacement,
        TextureType.DZ
      );

      requestAnimationFrame(() => step());
    };

    step();
  }

  private createWaterGeometry(params: DisplacementFieldBuildParams) {
    const vertices: vec3[] = [];
    const ids: vec2[] = [];
    const indices: number[] = [];
    const N = params.subdivisions;
    const L = params.size;
    const delta = L / (N - 1);
    const offset = vec3.fromValues(-L * 0.5, 0.0, -L * 0.5);

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        let v0 = vec3.fromValues(j * delta, 0.0, i * delta);
        vec3.add(v0, v0, offset);
        let id0 = vec2.fromValues(j, i);
        let v1 = vec3.fromValues((j + 1) * delta, 0.0, i * delta);
        vec3.add(v1, v1, offset);
        let id1 = vec2.fromValues(j + 1, i);
        let v2 = vec3.fromValues((j + 1) * delta, 0.0, (i + 1) * delta);
        vec3.add(v2, v2, offset);
        let id2 = vec2.fromValues(j + 1, i + 1);
        let v3 = vec3.fromValues(j * delta, 0.0, (i + 1) * delta);
        vec3.add(v3, v3, offset);
        let id3 = vec2.fromValues(j, i + 1);

        indices.push(vertices.length, vertices.length + 1, vertices.length + 2);
        indices.push(vertices.length + 2, vertices.length + 3, vertices.length);

        vertices.push(v0, v1, v2, v3);
        ids.push(id0, id1, id2, id3);
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
          semantics: 'id',
          size: 2,
          type: WebGL2RenderingContext.FLOAT,
          slot: 1,
          offset: vertices.length * 3 * Float32Array.BYTES_PER_ELEMENT,
          stride: 8,
        },
      ],

      vertexData: Float32Array.from(
        [...vertices, ...ids].map((v) => [...v]).flat()
      ),
      indexData: Uint32Array.from(indices),
    };

    return this.gpu.createGeometry(mesh);
  }
}
