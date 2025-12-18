import { vec2 } from 'gl-matrix';
import {
  preprocess,
  Texture2dArray,
  UniformBlockBinding,
  UniformBuffer,
} from '../graphics';
import {
  Geometry,
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
  TextureFiltering,
  TextureMode,
} from '../graphics/gpu';
import { createQuad } from '../graphics/mesh';
import { vs as h0ConjVs, fs as h0ConjFs } from '../programs/h0-conj.glsl';

export interface Spectrum {
  data: Texture2dArray;
  resolution: number;
  cascades: number;
  settings: SpectrumSettings;
}

export interface SpectrumSettings {
  wind: vec2;
  size: number;
  factor: number;
}

export abstract class SpectrumBase<T extends SpectrumSettings>
  implements Spectrum
{
  get data(): Texture2dArray {
    return this.h0ConjTextures;
  }

  settings: Readonly<SpectrumSettings>;

  protected readonly h0Program: ShaderProgram;
  protected readonly h0Textures: Texture2dArray;
  protected readonly h0FrameBuffer: RenderTarget;
  protected readonly h0ConjProgram: ShaderProgram;
  protected readonly h0ConjTextures: Texture2dArray;
  protected readonly h0ConjFrameBuffer: RenderTarget;
  protected readonly noise: Texture2d;
  protected readonly quad: Geometry;
  protected readonly uniformBlock: UniformBuffer;
  protected readonly uniformData = new Uint8Array(256);

  constructor(
    protected readonly gpu: Gpu,
    public readonly resolution: number,
    public readonly cascades: number,
    protected readonly vs: string,
    protected readonly fs: string
  ) {
    this.h0Program = this.createH0Program();
    this.h0Textures = this.createH0Textures();
    this.h0FrameBuffer = this.createFramebuffer(this.h0Textures);
    this.h0ConjProgram = this.createh0ConjProgram();
    this.h0ConjTextures = this.createh0ConjTextures();
    this.h0ConjFrameBuffer = this.createFramebuffer(this.h0ConjTextures);
    this.noise = this.createNoiseTexture();
    this.quad = this.createQuad();
    this.uniformBlock = this.createUniformBlock();
    this.setRandomSeed(0);
  }

  generate(settings: T): void {
    this.gpu.setViewport(0, 0, this.resolution, this.resolution);
    this.fillUniformBuffer(this.uniformData, settings);
    this.gpu.updateUniformBlock(this.uniformBlock, this.uniformData);
    this.generateH0Spectrum();
    this.generateH0ConjSpectrum();
    this.settings = settings;
  }

  setRandomSeed(seed: number): void {
    this.gpu.updateTexture(
      this.noise,
      this.resolution,
      this.resolution,
      WebGL2RenderingContext.RG,
      WebGL2RenderingContext.FLOAT,
      this.getNoise2d(this.resolution, seed)
    );
  }

  dispose(): void {
    this.gpu.destroyGeometry(this.quad);
    this.gpu.destroyTexture(this.noise);
    this.gpu.destroyRenderTarget(this.h0ConjFrameBuffer);
    this.gpu.destroyTexture(this.h0ConjTextures);
    this.gpu.destroyProgram(this.h0ConjProgram);
    this.gpu.destroyRenderTarget(this.h0FrameBuffer);
    this.gpu.destroyTexture(this.h0Textures);
    this.gpu.destroyProgram(this.h0Program);
  }

  protected fillUniformBuffer(buffer: Uint8Array, settings: T): void {
    const dataView = new DataView(buffer.buffer);
    const sizes = this.getSizes(settings.size);

    for (let i = 0; i < sizes.length; i++) {
      dataView.setFloat32(i * 16, sizes[i], true);
    }

    dataView.setUint32(64, this.resolution, true);

    for (let i = 0, min = 0, max = 0; i < sizes.length; i++) {
      max =
        i == sizes.length - 1
          ? 9999.9
          : (Math.SQRT2 * Math.PI * this.resolution) / sizes[i] / 2.0;
      // max =
      //   i == sizes.length - 1 ? 9999.9 : ((Math.PI * 2.0) / sizes[i + 1]) * 6.0;
      dataView.setFloat32(i * 16 + 80, min, true);
      dataView.setFloat32(i * 16 + 144, max, true);
      min = max;
    }

    dataView.setFloat32(208, settings.wind[0], true);
    dataView.setFloat32(212, settings.wind[1], true);
    dataView.setFloat32(216, settings.factor, true);
  }

  protected generateH0Spectrum(): void {
    this.gpu.setRenderTarget(this.h0FrameBuffer);
    this.gpu.setProgram(this.h0Program);
    this.gpu.setProgramTexture(this.h0Program, 'noise', this.noise, 0);
    this.gpu.drawGeometry(this.quad);
  }

  protected generateH0ConjSpectrum(): void {
    this.gpu.setRenderTarget(this.h0ConjFrameBuffer);
    this.gpu.setProgram(this.h0ConjProgram);
    this.gpu.setProgramTextureArray(
      this.h0ConjProgram,
      'h0Textures',
      this.h0Textures,
      0
    );
    this.gpu.drawGeometry(this.quad);
  }

  protected getSizes(base: number): number[] {
    const ratio = 1.0 - 0.6180339887498948 - 0.1;

    return Array.from(new Array(this.cascades), (_, i) => base * ratio ** i);
  }

  protected createH0Textures(): Texture2dArray {
    return this.gpu.createFloat2TextureArray(
      this.resolution,
      this.resolution,
      this.cascades
    );
  }

  protected createh0ConjTextures(): Texture2dArray {
    return this.gpu.createFloat4TextureArray(
      this.resolution,
      this.resolution,
      this.cascades
    );
  }

  protected createFramebuffer(textures: Texture2dArray): RenderTarget {
    const framebuffer = this.gpu.createRenderTarget();
    this.gpu.attachTextureArray(framebuffer, textures, this.cascades);

    return framebuffer;
  }

  protected createH0Program(): ShaderProgram {
    const program = this.gpu.createShaderProgram(
      this.vs,
      preprocess(this.fs, { CASCADES: this.cascades })
    );
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Spectrum,
      'Spectrum'
    );

    return program;
  }

  protected createh0ConjProgram(): ShaderProgram {
    const program = this.gpu.createShaderProgram(
      h0ConjVs,
      preprocess(h0ConjFs, { CASCADES: this.cascades })
    );
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Spectrum,
      'Spectrum'
    );

    return program;
  }

  protected createQuad(): Geometry {
    return this.gpu.createGeometry(createQuad());
  }

  private createNoiseTexture(): Texture2d {
    return this.gpu.createFloat2Texture(
      this.resolution,
      this.resolution,
      TextureFiltering.Nearest,
      TextureMode.Repeat
    );
  }

  protected createUniformBlock(): UniformBuffer {
    return this.gpu.createUniformBlock(
      this.uniformData.byteLength,
      UniformBlockBinding.Spectrum
    );
  }

  private getNoise2d(size: number, randomSeed: number) {
    const mulberry32 = (a: number) => {
      return (): number => {
        var t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const random = mulberry32(randomSeed);
    return Float32Array.from([...Array(size * size * 2)].map(() => random()));
  }
}
