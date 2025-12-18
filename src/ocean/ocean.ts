import { vec3 } from 'gl-matrix';
import {
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
  Geometry,
} from '../graphics/gpu';
import { vs as hkVs, fs as hkFs } from '../programs/hk.glsl';
import {
  vs as turbulenceVs,
  fs as turbulenceFs,
} from '../programs/turbulence.glsl';
import { IFFT2 } from '../fft/ifft2';
import { createQuad } from '../graphics/mesh';
import { Spectrum } from './spectrum';
import {
  preprocess,
  Readback,
  Texture2dArray,
  UniformBlockBinding,
  UniformBuffer,
} from '../graphics';
import { TextureSampler } from './sampler';

export interface OceanCascadeSettings {
  steepness: number;
  foamOffset: number;
  foamFalloff: number
}

export type OceanSettings = OceanCascadeSettings[];

export class Ocean {
  private readonly settings: Readonly<OceanSettings> = [
    {
      steepness: 1.0,
      foamOffset: 0.3,
      foamFalloff: 0.05
    },
    {
      steepness: 1.0,
      foamOffset: 0.3,
      foamFalloff: 0.05
    },
    {
      steepness: 1.0,
      foamOffset: 0.3,
      foamFalloff: 0.05
    },
    {
      steepness: 1.0,
      foamOffset: 0.3,
      foamFalloff: 0.05
    },
  ];
  private readonly quad: Geometry;
  private readonly hkProgram: ShaderProgram;
  private readonly hkTextures: Texture2dArray;
  private readonly hkFramebuffer: RenderTarget;
  private readonly turbulenceProgram: ShaderProgram;
  private readonly turbulenceSSSFramebuffers: RenderTarget[];
  private readonly turbulenceTextures: Texture2d[];
  private readonly sssTextures: Texture2d[];
  private readonly ifft: IFFT2;
  private readonly settingsUniformBlock: UniformBuffer;
  private readonly uniformData = new Uint8Array(192);
  private turbulenceTextureIndex = 0;
  private readonly displacementsReadback: Readback;
  private readonly displacements: Float32Array;
  private readonly sampler: TextureSampler;
  private lastTime: number = Number.MAX_VALUE;

  get data(): Texture2dArray {
    return this.hkTextures;
  }

  get turbulence(): Texture2d {
    return this.turbulenceTextures[this.turbulenceTextureIndex % 2];
  }

  get sss(): Texture2d {
    return this.sssTextures[this.turbulenceTextureIndex % 2];
  }

  constructor(private readonly gpu: Gpu, public readonly spectrum: Spectrum) {
    this.quad = this.createQuad();
    this.hkProgram = this.createSpectrumDataProgram();
    this.hkTextures = this.createSpectrumDataTextures();
    this.hkFramebuffer = this.createSpectrumDataFramebuffer(this.hkTextures);
    this.turbulenceProgram = this.createTurbulenceProgram();
    this.turbulenceTextures = this.createTurbulenceTextures();
    this.sssTextures = this.createSSSTextures();
    this.turbulenceSSSFramebuffers = this.createTurbulenceSSSFramebuffers(
      this.turbulenceTextures,
      this.sssTextures
    );
    this.ifft = this.createIFFT2();
    this.settingsUniformBlock = this.createSettingsUniformBlock();
    this.displacementsReadback = this.createReadback();
    this.displacements = new Float32Array(this.spectrum.resolution ** 2 * 4);
    this.sampler = new TextureSampler(
      this.displacements,
      this.spectrum.resolution,
      4
    );
  }

  generate(time: number): void {
    this.gpu.setViewport(
      0,
      0,
      this.spectrum.resolution,
      this.spectrum.resolution
    );
    this.generateSpectrumData(time);
    this.computeIFFT();
    this.generateTurbulence(time);
    this.generateMipmaps();
    this.readDisplacements();
    this.lastTime = time;
  }

  dispose(): void {
    this.gpu.destroyReadback(this.displacementsReadback);
    this.gpu.destroyBuffer(this.settingsUniformBlock);
    this.ifft.dispose();
    this.turbulenceSSSFramebuffers.forEach((framebuffer) =>
      this.gpu.destroyRenderTarget(framebuffer)
    );
    this.turbulenceTextures.forEach((texture) =>
      this.gpu.destroyTexture(texture)
    );
    this.sssTextures.forEach((texture) => this.gpu.destroyTexture(texture));
    this.gpu.destroyProgram(this.turbulenceProgram);
    this.gpu.destroyRenderTarget(this.hkFramebuffer);
    this.gpu.destroyTexture(this.hkTextures);
    this.gpu.destroyProgram(this.hkProgram);
    this.gpu.destroyGeometry(this.quad);
  }

  getSettings(): Readonly<OceanSettings> {
    return this.settings;
  }

  setSettings(settings: Partial<OceanSettings>): void {
    Object.assign(this.settings, settings);
    const dataView = new DataView(this.uniformData.buffer);

    for (let i = 0; i < this.settings.length; i++) {
      dataView.setFloat32(i * 16, -this.settings[i].steepness, true);
      dataView.setFloat32(i * 16 + 64, this.settings[i].foamFalloff, true);
      dataView.setFloat32(i * 16 + 128, this.settings[i].foamOffset, true);
    }

    this.gpu.updateUniformBlock(this.settingsUniformBlock, dataView);
  }

  samplePoint(out: vec3, x: number, z: number): vec3 {
    const ITERATIONS = 4;
    vec3.set(out, 0, 0, 0);

    for (let it = 0; it < ITERATIONS; it++) {
      this.getDisplacement(out, x - out[0], z - out[2]);
    }

    return vec3.set(out, x, out[1], z);
  }

  getDisplacement(out: vec3, x: number, z: number): vec3 {
    const displacement = this.sampler.sampleLinear(
      x / this.spectrum.settings.size,
      z / this.spectrum.settings.size
    );

    return vec3.set(
      out,
      displacement[0] * -this.settings[0].steepness,
      displacement[1],
      displacement[2] * -this.settings[0].steepness
    );
  }

  private generateSpectrumData(time: number): void {
    this.gpu.setProgram(this.hkProgram);
    this.gpu.setProgramTextureArray(
      this.hkProgram,
      'h0Textures',
      this.spectrum.data,
      0
    );
    this.gpu.setProgramVariable(this.hkProgram, 't', 'float', time);
    this.gpu.setRenderTarget(this.hkFramebuffer);
    this.gpu.drawGeometry(this.quad);
  }

  private computeIFFT(): void {
    this.ifft.compute();
  }

  private generateTurbulence(time: number): void {
    this.gpu.setProgram(this.turbulenceProgram);
    this.gpu.setProgramTextureArray(
      this.turbulenceProgram,
      'data',
      this.hkTextures,
      0
    );
    this.gpu.setProgramTexture(
      this.turbulenceProgram,
      'prevTurbulence',
      this.turbulenceTextures[this.turbulenceTextureIndex],
      1
    );
    this.gpu.setProgramTexture(
      this.turbulenceProgram,
      'prevSSS',
      this.sssTextures[this.turbulenceTextureIndex],
      2
    );
    // this.gpu.setProgramVariable(
    //   this.turbulenceProgram,
    //   'dt',
    //   'float',
    //   Math.max(time - this.lastTime, 0)
    // );
    this.gpu.setRenderTarget(
      this.turbulenceSSSFramebuffers[this.turbulenceTextureIndex]
    );
    this.gpu.drawGeometry(this.quad);
    this.turbulenceTextureIndex = (this.turbulenceTextureIndex + 1) % 2;
  }

  private generateMipmaps(): void {
    this.gpu.generateMipmaps(
      this.hkTextures,
      WebGL2RenderingContext.TEXTURE_2D_ARRAY
    );
    this.gpu.generateMipmaps(this.turbulence);
    this.gpu.generateMipmaps(this.sss);
  }

  private readDisplacements() {
    if (this.gpu.readbackReady(this.displacementsReadback)) {
      this.gpu.getReadbackValues(
        this.displacementsReadback,
        this.displacements
      );
      this.gpu.requestReadback(
        this.displacementsReadback,
        this.hkTextures,
        this.spectrum.resolution,
        this.spectrum.resolution,
        0
      );
    }
  }

  private createSpectrumDataTextures(): Texture2dArray {
    return this.gpu.createFloat4TextureArray(
      this.spectrum.resolution,
      this.spectrum.resolution,
      this.spectrum.cascades * 2
    );
  }

  private createSpectrumDataProgram(): ShaderProgram {
    const program = this.gpu.createShaderProgram(
      hkVs,
      preprocess(hkFs, { CASCADES: this.spectrum.cascades })
    );
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Spectrum,
      'Spectrum'
    );

    return program;
  }

  private createSpectrumDataFramebuffer(
    textures: Texture2dArray
  ): RenderTarget {
    const framebuffer = this.gpu.createRenderTarget();
    this.gpu.attachTextureArray(
      framebuffer,
      textures,
      this.spectrum.cascades * 2
    );

    return framebuffer;
  }

  private createTurbulenceProgram(): ShaderProgram {
    const program = this.gpu.createShaderProgram(
      turbulenceVs,
      preprocess(turbulenceFs, { CASCADES: this.spectrum.cascades })
    );
    this.gpu.linkUniformBlock(program, UniformBlockBinding.Ocean, 'Ocean');
    this.gpu.linkUniformBlock(
      program,
      UniformBlockBinding.Spectrum,
      'Spectrum'
    );

    return program;
  }

  private createTurbulenceSSSFramebuffers(
    turbulenceTextures: Texture2d[],
    sssTextures: Texture2d[]
  ): RenderTarget[] {
    const framebuffers: RenderTarget[] = [
      this.gpu.createRenderTarget(),
      this.gpu.createRenderTarget(),
    ];
    this.gpu.attachTextures(framebuffers[0], [
      turbulenceTextures[1],
      sssTextures[1],
    ]);
    this.gpu.attachTextures(framebuffers[1], [
      turbulenceTextures[0],
      sssTextures[0],
    ]);

    return framebuffers;
  }

  private createTurbulenceTextures(): Texture2d[] {
    return [
      this.gpu.createFloat4Texture(
        this.spectrum.resolution,
        this.spectrum.resolution
      ),
      this.gpu.createFloat4Texture(
        this.spectrum.resolution,
        this.spectrum.resolution
      ),
    ];
  }

  private createSSSTextures(): Texture2d[] {
    return [
      this.gpu.createFloat4Texture(
        this.spectrum.resolution,
        this.spectrum.resolution
      ),
      this.gpu.createFloat4Texture(
        this.spectrum.resolution,
        this.spectrum.resolution
      ),
    ];
  }

  private createQuad(): Geometry {
    return this.gpu.createGeometry(createQuad());
  }

  private createIFFT2(): IFFT2 {
    return new IFFT2(
      this.gpu,
      this.spectrum.resolution,
      this.spectrum.cascades * 2, // 2 textures per spectum data
      this.hkTextures
    );
  }

  protected createSettingsUniformBlock(): UniformBuffer {
    return this.gpu.createUniformBlock(
      this.uniformData.byteLength,
      UniformBlockBinding.Ocean
    );
  }

  protected createReadback(): Readback {
    return this.gpu.createReadback(
      this.spectrum.resolution ** 2 * 4 * Float32Array.BYTES_PER_ELEMENT
    );
  }
}
