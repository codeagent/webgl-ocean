import {
  Geometry,
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
} from '../graphics';
import { DisplacementFieldBuildParams } from './displacement-field-factory';

import { vs as fft2hvs, fs as fft2hfs } from './programs/fft2-h';
import { vs as fft2vvs, fs as fft2vfs } from './programs/fft2-v';
import { vs as fft2multvs, fs as fft2multfs } from './programs/fft2-mult';
import { vs as hkvs, fs as hkfs } from './programs/hk';

export class DisplacementField {
  get displacement(): Texture2d {
    return this.displacementTexture;
  }

  private readonly ppTexture: Texture2d;
  private readonly hkTexture: Texture2d;
  private ifftTexture: Texture2d = null;
  private displacementTexture: Texture2d = null;
  private readonly framebuffer: RenderTarget;
  private readonly hkProgram: ShaderProgram;
  private readonly fft2hProgram: ShaderProgram;
  private readonly fft2vProgram: ShaderProgram;
  private readonly fft2multProgram: ShaderProgram;

  constructor(
    private readonly gpu: Gpu,
    private readonly h0Texture: Texture2d,
    private readonly butterflyTexture: Texture2d,
    private readonly quad: Geometry,
    public readonly params: DisplacementFieldBuildParams
  ) {
    this.framebuffer = this.gpu.createRenderTarget();
    this.hkTexture = this.gpu.createFloat4Texture(
      params.subdivisions,
      params.subdivisions
    );
    this.ppTexture = this.gpu.createFloat4Texture(
      params.subdivisions,
      params.subdivisions
    );
    this.fft2hProgram = this.gpu.createShaderProgram(fft2hvs, fft2hfs);
    this.fft2vProgram = this.gpu.createShaderProgram(fft2vvs, fft2vfs);
    this.fft2multProgram = this.gpu.createShaderProgram(fft2multvs, fft2multfs);
    this.hkProgram = this.gpu.createShaderProgram(hkvs, hkfs);
  }

  update(time: number): void {
    this.generateHkTexture(time);
    this.ifft2();
    this.postMultiply();
  }

  download(data: Float32Array): void {
    this.gpu.attachTexture(this.framebuffer, this.displacementTexture, 0);
    this.gpu.readValues(
      this.framebuffer,
      data,
      this.params.subdivisions,
      this.params.subdivisions,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT
    );
  }

  private postMultiply() {
    this.gpu.setViewport(
      0,
      0,
      this.params.subdivisions,
      this.params.subdivisions
    );
    this.gpu.attachTexture(this.framebuffer, this.displacementTexture, 0);
    this.gpu.setRenderTarget(this.framebuffer);
    this.gpu.setProgram(this.fft2multProgram);
    this.gpu.setProgramTexture(
      this.fft2multProgram,
      'iff2',
      this.ifftTexture,
      0
    );
    this.gpu.drawGeometry(this.quad);
  }

  private generateHkTexture(time: number): Texture2d {
    this.gpu.setViewport(
      0,
      0,
      this.params.subdivisions,
      this.params.subdivisions
    );
    this.gpu.setProgram(this.hkProgram);
    this.gpu.setProgramTexture(this.hkProgram, 'h0Texture', this.h0Texture, 0);
    this.gpu.setProgramVariable(
      this.hkProgram,
      'subdivisions',
      'uint',
      this.params.subdivisions
    );
    this.gpu.setProgramVariable(
      this.hkProgram,
      'size',
      'float',
      this.params.size
    );
    this.gpu.setProgramVariable(this.hkProgram, 't', 'float', time);
    this.gpu.attachTexture(this.framebuffer, this.hkTexture, 0);
    this.gpu.setRenderTarget(this.framebuffer);
    this.gpu.drawGeometry(this.quad);

    return this.hkTexture;
  }

  private ifft2(): void {
    const phases = Math.log2(this.params.subdivisions);
    const pingPong = [this.hkTexture, this.ppTexture];

    // horizontal ifft
    let ping = 0;
    let pong = 1;
    this.gpu.setViewport(
      0,
      0,
      this.params.subdivisions,
      this.params.subdivisions
    );
    this.gpu.setProgram(this.fft2hProgram);
    this.gpu.setProgramTexture(
      this.fft2hProgram,
      'butterfly',
      this.butterflyTexture,
      0
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.attachTexture(this.framebuffer, pingPong[pong], 0);
      this.gpu.setRenderTarget(this.framebuffer);
      this.gpu.setProgramVariable(this.fft2hProgram, 'phase', 'uint', phase);
      this.gpu.setProgramTexture(
        this.fft2hProgram,
        'source',
        pingPong[ping],
        1
      );
      this.gpu.drawGeometry(this.quad);
      ping = pong;
      pong = (pong + 1) % 2;
    }

    // vertical ifft
    this.gpu.setProgram(this.fft2vProgram);
    this.gpu.setProgramTexture(
      this.fft2vProgram,
      'butterfly',
      this.butterflyTexture,
      0
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.attachTexture(this.framebuffer, pingPong[pong], 0);
      this.gpu.setRenderTarget(this.framebuffer);
      this.gpu.setProgramVariable(this.fft2vProgram, 'phase', 'uint', phase);
      this.gpu.setProgramTexture(
        this.fft2vProgram,
        'source',
        pingPong[ping],
        1
      );
      this.gpu.drawGeometry(this.quad);
      ping = pong;
      pong = (pong + 1) % 2;
    }

    this.ifftTexture = pingPong[ping];
    this.displacementTexture = pingPong[pong];
  }
}
