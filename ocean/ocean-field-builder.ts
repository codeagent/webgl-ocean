import { createButterflyTexture } from './butterfly';
import {
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
  Geometry,
  quad,
  TextureFiltering,
  TextureMode,
} from '../graphics';
import { OceanField } from './ocean-field';
import {
  defaultBuildParams,
  OceanFieldBuildParams,
} from './ocean-field-build-params';
import { vs as h0vs, fs as h0fs } from './programs/h0';
import { vec3 } from 'gl-matrix';

export class OceanFieldBuilder {
  private readonly quad: Geometry;
  private readonly frameBuffer: RenderTarget;
  private readonly butterflyTexture = new Map<number, Texture2d>();
  private readonly h0Program: ShaderProgram;

  constructor(private readonly gpu: Gpu) {
    this.quad = this.gpu.createGeometry(quad);
    this.frameBuffer = this.gpu.createRenderTarget();
    this.h0Program = this.gpu.createShaderProgram(h0vs, h0fs);
  }

  build(params: OceanFieldBuildParams): OceanField {
    /** @todo: merge options */
    params = { ...defaultBuildParams, ...params };
    return new OceanField(
      this.gpu,
      this.createH0Textures(params),
      this.getButterflyTexture(params.resolution),
      this.quad,
      params
    );
  }

  private createNoiseTexture(size: number, randomSeed: number): Texture2d {
    const texture = this.gpu.createFloat4Texture(
      size,
      size,
      TextureFiltering.Linear,
      TextureMode.Mirror
    );
    this.gpu.updateTexture(
      texture,
      size,
      size,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      this.getNoise2d(size, randomSeed)
    );

    return texture;
  }

  private createH0Textures(
    params: OceanFieldBuildParams
  ): [Texture2d, Texture2d, Texture2d] {
    const spectrum0 = this.gpu.createFloat4Texture(
      params.resolution,
      params.resolution
    );
    const spectrum1 = this.gpu.createFloat4Texture(
      params.resolution,
      params.resolution
    );
    const spectrum2 = this.gpu.createFloat4Texture(
      params.resolution,
      params.resolution
    );

    this.gpu.attachTextures(this.frameBuffer, [
      spectrum0,
      spectrum1,
      spectrum2,
    ]);
    this.gpu.setRenderTarget(this.frameBuffer);
    this.gpu.setViewport(0, 0, params.resolution, params.resolution);
    this.gpu.clearRenderTarget();

    this.gpu.setProgram(this.h0Program);
    this.gpu.setProgramTexture(
      this.h0Program,
      'noise',
      this.createNoiseTexture(params.resolution, params.randomSeed),
      0
    );
    this.gpu.setProgramVariable(
      this.h0Program,
      'resolution',
      'uint',
      params.resolution
    );
    this.gpu.setProgramVariable(this.h0Program, 'wind', 'vec2', params.wind);
    this.gpu.setProgramVariable(
      this.h0Program,
      'alignment',
      'float',
      params.alignment
    );

    for (let i = 0; i < params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].size`,
        'float',
        params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].strength`,
        'float',
        (params.cascades[i].strength * 0.081) / params.cascades[i].size ** 2
      );
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].minK`,
        'float',
        (2.0 * Math.PI) / params.cascades[i].maxWave
      );
      this.gpu.setProgramVariable(
        this.h0Program,
        `cascades[${i}].maxK`,
        'float',
        (2.0 * Math.PI) / params.cascades[i].minWave
      );
    }

    this.gpu.drawGeometry(this.quad);
    this.gpu.setRenderTarget(null);

    return [spectrum0, spectrum1, spectrum2];
  }

  private getButterflyTexture(size: number) {
    if (!this.butterflyTexture.has(size)) {
      const texture = this.gpu.createFloat4Texture(Math.log2(size), size);
      this.gpu.updateTexture(
        texture,
        Math.log2(size),
        size,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        createButterflyTexture(size)
      );
      this.butterflyTexture.set(size, texture);
    }
    return this.butterflyTexture.get(size);
  }

  private getNoise2d(size: number, randomSeed: number) {
    /**
     * @todo: leverage randomSeed in noise generation
     */
    return Float32Array.from(
      [...Array(size * size * 4)].map(() => Math.random())
    );
  }
}
