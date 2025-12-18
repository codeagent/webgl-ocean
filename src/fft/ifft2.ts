import { createButterflyTexture } from './fft';
import {
  Geometry,
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
} from '../graphics/gpu';
import { createQuad } from '../graphics/mesh';
import { vs as ifft2Vs, fs as ifft2Fs } from '../programs/ifft2.glsl';
import {
  vs as postIfft2Vs,
  fs as postIfft2Fs,
} from '../programs/post-ifft2.glsl';
import { preprocess, Texture2dArray } from '../graphics';

export class IFFT2 {
  private quad: Geometry;
  private ifft2hProgram: ShaderProgram;
  private ifft2vProgram: ShaderProgram;
  private butterflyTexture: Texture2d;
  private ifft2Textures: Texture2dArray[] = [];
  private ifft2Framebuffers: RenderTarget[] = [];
  private postIfft2Program: ShaderProgram;
  private postIfft2Framebuffer: RenderTarget;
  private bufferIndex = 0;

  constructor(
    private readonly gpu: Gpu,
    private readonly size: number,
    private readonly layers: number,
    private readonly data: Texture2dArray
  ) {
    this.createQuad();
    this.createTextures();
    this.createFramebuffers();
    this.createPrograms();
  }

  compute(): void {
    this.bufferIndex = 0;
    const phases = Math.log2(this.size);
    this.gpu.setViewport(0, 0, this.size, this.size);
    this.horizontalIfft(phases);
    this.verticalIfft(phases);
    this.postIfft();
  }

  dispose(): void {
    this.gpu.destroyProgram(this.ifft2hProgram);
    this.gpu.destroyProgram(this.ifft2vProgram);
    this.ifft2Framebuffers.forEach((framebuffer) =>
      this.gpu.destroyRenderTarget(framebuffer)
    );
    this.ifft2Textures.forEach((texture) => this.gpu.destroyTexture(texture));
    this.gpu.destroyTexture(this.butterflyTexture);
    this.gpu.destroyGeometry(this.quad);
    this.gpu.destroyProgram(this.postIfft2Program);
    this.gpu.destroyRenderTarget(this.postIfft2Framebuffer);
  }

  private horizontalIfft(phases: number): void {
    this.gpu.setProgram(this.ifft2hProgram);
    this.gpu.setProgramTexture(
      this.ifft2hProgram,
      'butterfly',
      this.butterflyTexture,
      0
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.setRenderTarget(this.ifft2Framebuffers[this.bufferIndex]);
      this.gpu.setProgramVariable(this.ifft2hProgram, 'phase', 'uint', phase);
      this.gpu.setProgramTextureArray(
        this.ifft2hProgram,
        'data',
        phase == 0 ? this.data : this.ifft2Textures[this.bufferIndex],
        1
      );
      this.gpu.drawGeometry(this.quad);
      this.bufferIndex = (this.bufferIndex + 1) % 2;
    }
  }

  private verticalIfft(phases: number): void {
    this.gpu.setProgram(this.ifft2vProgram);
    this.gpu.setProgramTexture(
      this.ifft2vProgram,
      'butterfly',
      this.butterflyTexture,
      0
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.setRenderTarget(this.ifft2Framebuffers[this.bufferIndex]);
      this.gpu.setProgramVariable(this.ifft2vProgram, 'phase', 'uint', phase);
      this.gpu.setProgramTextureArray(
        this.ifft2vProgram,
        'data',
        this.ifft2Textures[this.bufferIndex],
        1
      );
      this.gpu.drawGeometry(this.quad);
      this.bufferIndex = (this.bufferIndex + 1) % 2;
    }
  }

  private postIfft(): void {
    this.gpu.setProgram(this.postIfft2Program);
    this.gpu.setProgramTextureArray(
      this.postIfft2Program,
      'data',
      this.ifft2Textures[this.bufferIndex],
      0
    );
    this.gpu.setRenderTarget(this.postIfft2Framebuffer);
    this.gpu.drawGeometry(this.quad);
  }

  private createPrograms(): void {
    this.ifft2hProgram = this.gpu.createShaderProgram(
      ifft2Vs,
      preprocess(ifft2Fs, { LAYERS: this.layers, IS_HORIZONTAL: 1 })
    );
    this.ifft2vProgram = this.gpu.createShaderProgram(
      ifft2Vs,
      preprocess(ifft2Fs, { LAYERS: this.layers, IS_HORIZONTAL: 0 })
    );
    this.postIfft2Program = this.gpu.createShaderProgram(
      postIfft2Vs,
      preprocess(postIfft2Fs, { LAYERS: this.layers })
    );
  }

  private createQuad(): void {
    this.quad = this.gpu.createGeometry(createQuad());
  }

  private createTextures(): void {
    this.butterflyTexture = this.gpu.createFloat4Texture(
      Math.log2(this.size),
      this.size
    );
    this.gpu.updateTexture(
      this.butterflyTexture,
      Math.log2(this.size),
      this.size,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      createButterflyTexture(this.size, true)
    );
    this.ifft2Textures = [
      this.gpu.createFloat4TextureArray(this.size, this.size, this.layers),
      this.gpu.createFloat4TextureArray(this.size, this.size, this.layers),
    ];
  }

  private createFramebuffers(): void {
    this.ifft2Framebuffers = [
      this.gpu.createRenderTarget(),
      this.gpu.createRenderTarget(),
    ];
    this.gpu.attachTextureArray(
      this.ifft2Framebuffers[0],
      this.ifft2Textures[1],
      this.layers
    );
    this.gpu.attachTextureArray(
      this.ifft2Framebuffers[1],
      this.ifft2Textures[0],
      this.layers
    );
    this.postIfft2Framebuffer = this.gpu.createRenderTarget();
    this.gpu.attachTextureArray(this.postIfft2Framebuffer, this.data, this.layers);
  }
}
