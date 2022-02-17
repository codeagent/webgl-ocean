import { Geometry, Gpu, RenderTarget, ShaderProgram, Texture2d } from './gpu';
import { HeightFieldBuildParams } from './height-field-factory';

import { vs as fft2hvs, fs as fft2hfs } from './programs/fft2-h';
import { vs as fft2vvs, fs as fft2vfs } from './programs/fft2-v';
import { vs as hkvs, fs as hkfs } from './programs/hk';

export class HeightField {
  get displacement(): Texture2d {
    return this._displacementTexture;
  }

  private readonly ppTexture: Texture2d;
  private readonly hkTexture: Texture2d;
  private readonly framebuffer: RenderTarget;
  private readonly hkProgram: ShaderProgram;
  private readonly fft2hProgram: ShaderProgram;
  private readonly fft2vProgram: ShaderProgram;
  private _displacementTexture: Texture2d;

  constructor(
    private readonly gpu: Gpu,
    private readonly h0Texture: Texture2d,
    private readonly butterflyTexture: Texture2d,
    private readonly quad: Geometry,
    public readonly params: HeightFieldBuildParams
  ) {
    this.framebuffer = this.gpu.createRenderTarget();
    this.hkTexture = this.gpu.createFloat4Texture(
      params.subdivisions,
      params.subdivisions
    );
    this._displacementTexture = this.ppTexture = this.gpu.createFloat4Texture(
      params.subdivisions,
      params.subdivisions
    );
    this.fft2hProgram = this.gpu.createShaderProgram(fft2hvs, fft2hfs);
    this.fft2vProgram = this.gpu.createShaderProgram(fft2vvs, fft2vfs);
    this.hkProgram = this.gpu.createShaderProgram(hkvs, hkfs);
  }

  update(time: number): void {
    this._displacementTexture = this.ifft2(this.generateHkTexture(time));
  }

  download(data: Float32Array): void {
    this.gpu.attachTexture(this.framebuffer, this._displacementTexture, 0);
    this.gpu.readValues(
      this.framebuffer,
      data,
      this.params.subdivisions,
      this.params.subdivisions,
      WebGL2RenderingContext.RG,
      WebGL2RenderingContext.FLOAT
    );
  }

  private generateHkTexture(time: number): Texture2d {
    this.gpu.setDimensions(this.params.subdivisions, this.params.subdivisions);
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

  private ifft2(fourierTexture: Texture2d): Texture2d {
    const phases = Math.log2(this.params.subdivisions);
    const pingPong = [fourierTexture, this.ppTexture];

    // horizontal fft
    let ping = 0;
    let pong = 1;
    this.gpu.setDimensions(this.params.subdivisions, this.params.subdivisions);
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

    // vertical fft
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
      this.gpu.setProgramVariable(this.fft2vProgram, 'phases', 'uint', phases);
      this.gpu.setProgramVariable(
        this.fft2vProgram,
        'N2',
        'uint',
        this.params.subdivisions * this.params.subdivisions
      );
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

    return pingPong[ping];
  }
}
