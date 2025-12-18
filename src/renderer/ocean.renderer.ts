import { mat4, vec3 } from 'gl-matrix';

import { Ocean } from '../ocean';
import { fs, vs } from '../programs/ocean.glsl';
import FOAM_TEXTURE_RAW from './foam';

import {
  createPlane,
  Geometry,
  Gpu,
  Sampler,
  ShaderProgram,
  TextureFiltering,
  TextureMode,
  Camera,
  Frustum,
  AABB,
  UniformBuffer,
  UniformBlockBinding,
  preprocess,
  Cubemap,
  Texture2d,
} from '../graphics';

export interface OceanRendererSettings {
  resolution: number;
  scale: number;
  lodMix: number;
  distanceFactor: number;
  maxTiers: number;
  minWaterLevel: number;
  maxWaterLevel: number;
  waterColor: vec3;
  foamColor: vec3;
  foamIntensity: number;
  breakingOffset: number;
  breakingIntensity: number;
  envColor: vec3;
  envMap: Cubemap;
  fixed: boolean;
  wired: boolean;
}

const defaultSettings: Readonly<OceanRendererSettings> = {
  scale: 1e4,
  maxTiers: 10,
  minWaterLevel: -10.0,
  maxWaterLevel: 10.0,
  resolution: 128,
  distanceFactor: 2.5,
  fixed: true,
  wired: false,
  waterColor: vec3.fromValues(0.0, 0.2, 0.3),
  foamColor: vec3.fromValues(1.0, 1.0, 1.0),
  foamIntensity: 1.0,
  envColor: vec3.fromValues(0.69, 0.84, 1.0),
  lodMix: 2.0,
  envMap: null,
  breakingBlur: 1.0,
  breakingIntensity: 1.0,
  breakingOffset: 0.21,
};

interface Tile {
  aabb: AABB;
  level: number;
}

export interface RenderStat {
  tests: number;
  tiles: number;
}

export class OceanRenderer {
  readonly stat: RenderStat = { tests: 0, tiles: 0 };
  private readonly shaders: Record<number, ShaderProgram> = {};
  private readonly settings: OceanRendererSettings = defaultSettings;
  public sampler: Sampler;
  private geometry: Geometry;
  private frustum: Frustum;
  private transformUniformBlock: UniformBuffer;
  private materialUniformBlock: UniformBuffer;
  private foamTexture: Texture2d;

  constructor(private readonly gpu: Gpu) {
    this.createUniformBlocks();
    this.sampler = this.gpu.createSampler(
      TextureFiltering.LinearMipmapLinear,
      TextureMode.Repeat
    );
    this.foamTexture = this.createFoamTexture();
    this.setSettings(defaultSettings);
  }

  render(camera: Camera, ocean: Ocean) {
    if (!this.frustum) {
      this.frustum = new Frustum(camera);
    } else {
      this.frustum.transform(camera.transform);
    }

    if (!this.shaders[ocean.spectrum.cascades]) {
      this.shaders[ocean.spectrum.cascades] = this.createProgram(
        ocean.spectrum.cascades
      );
    }

    const shader = this.shaders[ocean.spectrum.cascades];
    const settings = this.getSettings();
    this.gpu.setProgram(shader);
    this.gpu.setProgramTextureArray(
      shader,
      'data',
      ocean.data,
      0,
      this.sampler
    );
    this.gpu.setProgramTexture(
      shader,
      'turbulence',
      ocean.turbulence,
      1,
      this.sampler
    );

    this.gpu.setProgramTexture(
      shader,
      'sssTexture',
      ocean.sss,
      2,
      this.sampler
    );

    const uniformData = new Float32Array(52);
    uniformData.set(camera.position, 0);
    uniformData.set(camera.view, 4);
    uniformData.set(camera.projection, 36);

    if (this.geometry) {
      this.stat.tiles = 0;

      for (const tile of this.generateTiles(this.frustum)) {
        this.renderTile(tile, this.geometry, settings, uniformData);
        this.stat.tiles++;
      }
    }
  }

  dispose(): void {
    this.gpu.destroyTexture(this.foamTexture);
    Object.values(this.shaders).forEach((program) =>
      this.gpu.destroyProgram(program)
    );
    this.gpu.destroyBuffer(this.transformUniformBlock);
    this.gpu.destroyBuffer(this.materialUniformBlock);
    this.gpu.destroyGeometry(this.geometry);
    this.gpu.destroySampler(this.sampler);
  }

  private renderTile(
    tile: Tile,
    geometry: Geometry,
    settings: OceanRendererSettings,
    uniformData: Float32Array
  ) {
    const { aabb, level } = tile;
    const scale = settings.scale / 2 ** level;
    const offset = vec3.fromValues(
      (aabb.min[0] + aabb.max[0]) * 0.5,
      0.0,
      (aabb.min[2] + aabb.max[2]) * 0.5
    );
    const transform = mat4.create();
    mat4.fromTranslation(transform, offset);
    mat4.scale(transform, transform, vec3.fromValues(scale, 1.0, scale));
    uniformData.set(transform, 20);

    this.gpu.updateUniformBlock(this.transformUniformBlock, uniformData);
    this.gpu.drawGeometry(geometry);
  }

  private *generateTiles(frustum: Frustum): IterableIterator<Tile> {
    const {
      scale,
      minWaterLevel,
      maxWaterLevel,
      distanceFactor,
      maxTiers,
      fixed,
    } = this.getSettings();

    const snap = this.settings.scale / 10.0;
    const offsetX = fixed ? Math.trunc(frustum.origin[0] / snap) * snap : 0.0;
    const offsetZ = fixed ? Math.trunc(frustum.origin[2] / snap) * snap : 0.0;

    const stack: Tile[] = [
      {
        aabb: new AABB(
          vec3.fromValues(
            -scale * 0.5 + offsetX,
            minWaterLevel,
            -scale * 0.5 + offsetZ
          ),
          vec3.fromValues(
            scale * 0.5 + offsetX,
            maxWaterLevel,
            scale * 0.5 + offsetZ
          )
        ),
        level: 0,
      },
    ];

    this.stat.tests = 0;

    while (stack.length) {
      const { aabb, level } = stack.pop();
      const size = Math.abs(aabb.max[0] - aabb.min[0]);

      if (frustum.testAABB(aabb)) {
        if (
          level === maxTiers ||
          aabb.distance(frustum.origin) * distanceFactor > size
        ) {
          yield { aabb, level };
        } else {
          // subdivide
          const aabb0 = new AABB(
            aabb.min,
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              maxWaterLevel,
              aabb.min[2] + size * 0.5
            )
          );
          const aabb1 = new AABB(
            vec3.fromValues(
              aabb.min[0],
              minWaterLevel,
              aabb.min[2] + size * 0.5
            ),
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              maxWaterLevel,
              aabb.max[2]
            )
          );
          const aabb2 = new AABB(
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              minWaterLevel,
              aabb.min[2] + size * 0.5
            ),
            aabb.max
          );
          const aabb3 = new AABB(
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              minWaterLevel,
              aabb.min[2]
            ),
            vec3.fromValues(
              aabb.max[0],
              maxWaterLevel,
              aabb.min[2] + size * 0.5
            )
          );
          stack.push(
            { aabb: aabb0, level: level + 1 },
            { aabb: aabb1, level: level + 1 },
            { aabb: aabb2, level: level + 1 },
            { aabb: aabb3, level: level + 1 }
          );
        }
      }

      this.stat.tests++;
    }
  }

  public getSettings(): Readonly<OceanRendererSettings> {
    return this.settings;
  }

  public setSettings(settings: OceanRendererSettings): void {
    settings = Object.assign({}, this.settings, settings);

    if (
      !this.geometry ||
      settings.resolution != this.settings.resolution ||
      settings.wired != this.settings.wired
    ) {
      this.updateGeometry(settings);
    }

    this.updateMaterial(settings);
    Object.assign(this.settings, settings);
  }

  private createProgram(cascades: number): ShaderProgram {
    const program = this.gpu.createShaderProgram(
      preprocess(vs, { CASCADES: cascades }),
      preprocess(fs, { CASCADES: cascades })
    );
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Spectrum,
      'Spectrum'
    );
    this.gpu.linkUniformBlock(program, UniformBlockBinding.Ocean, 'Ocean');
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Transform,
      'Transform'
    );
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Material,
      'Material'
    );

    return program;
  }

  private createUniformBlocks() {
    this.transformUniformBlock = this.gpu.createUniformBlock(
      208,
      UniformBlockBinding.Transform
    );
    this.materialUniformBlock = this.gpu.createUniformBlock(
      84,
      UniformBlockBinding.Material
    );
  }

  private createFoamTexture(): Texture2d {
    const texture = this.gpu.createRGB8Texture(256, 256);
    this.gpu.updateTexture(
      texture,
      256,
      256,
      WebGL2RenderingContext.RGB,
      WebGL2RenderingContext.UNSIGNED_BYTE,
      new Uint8Array(FOAM_TEXTURE_RAW)
    );

    return texture;
  }

  private updateGeometry(settings: OceanRendererSettings): void {
    if (this.geometry) {
      this.gpu.destroyGeometry(this.geometry);
    }

    const { wired } = settings;

    this.geometry = this.gpu.createGeometry(
      createPlane(settings.resolution, 1.0, wired),
      wired ? WebGL2RenderingContext.LINES : WebGL2RenderingContext.TRIANGLES
    );
  }

  private updateMaterial(settings: OceanRendererSettings): void {
    const uniformData = new Float32Array(17);
    uniformData.set(
      [
        settings.lodMix,
        settings.foamIntensity,
        settings.breakingIntensity,
        settings.breakingOffset
      ],
      0
    );
    uniformData.set(settings.waterColor, 4);
    uniformData.set(settings.foamColor, 8);
    uniformData.set(settings.envColor, 12);
    this.gpu.updateUniformBlock(this.materialUniformBlock, uniformData);
  }
}
