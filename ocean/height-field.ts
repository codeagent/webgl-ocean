import { Geometry, Gpu, RenderTarget, ShaderProgram, Texture2d } from './gpu';
import { HeightFieldBuildParams } from './height-field-factory';

import { vs as fft2vs, fs as fft2fs } from './programs/fft2';

export class HeightField {
  private readonly ppTexture: Texture2d;
  private readonly hkTexture: Texture2d;
  private readonly framebuffer: RenderTarget;
  private readonly fft2Program: ShaderProgram;

  constructor(
    private readonly gpu: Gpu,
    private readonly h0Texture: Texture2d,
    private readonly butterflyTexture: Texture2d,
    private readonly quad: Geometry,
    public readonly params: HeightFieldBuildParams
  ) {
    this.framebuffer = this.gpu.createRenderTarget();
    this.hkTexture = this.gpu.createFloat2Texture(
      params.subdivisions,
      params.subdivisions
    );
    this.ppTexture = this.gpu.createFloat2Texture(
      params.subdivisions,
      params.subdivisions
    );
    this.fft2Program = this.gpu.createShaderProgram(fft2vs, fft2fs);
  }

  update(time: number): void {}

  download(data: Float32Array): void {}

  private generateHkTexture(time: number): Float32Array {
    // @todo:
    const data = new Float32Array(
      this.params.subdivisions * this.params.subdivisions * 2
    );
    data.forEach((_, i, arr) => (arr[i] = Math.random() * 2.0 - 1.0));

    this.gpu.updateTexture(
      this.hkTexture,
      this.params.subdivisions,
      this.params.subdivisions,
      WebGL2RenderingContext.RG,
      WebGL2RenderingContext.FLOAT,
      data
    );

    return data;
  }

  private fft2(fourierTexture: Texture2d): Texture2d {
    const phases = Math.log2(this.params.subdivisions);
    const pingPong = [fourierTexture, this.ppTexture];

    // horizontal fft
    let ping = 0;
    let pong = 1;
    this.gpu.setDimensions(this.params.subdivisions, this.params.subdivisions);
    this.gpu.setProgram(this.fft2Program);
    this.gpu.setProgramTexture(
      this.fft2Program,
      'butterfly',
      this.butterflyTexture,
      0
    );

    for (let phase = 0; phase < phases; phase++) {
      this.gpu.attachTexture(this.framebuffer, pingPong[pong], 0);
      this.gpu.setRenderTarget(this.framebuffer);
      this.gpu.setProgramVariable(this.fft2Program, 'phase', 'uint', phase);
      this.gpu.setProgramTexture(this.fft2Program, 'source', pingPong[ping], 1);
      this.gpu.drawGeometry(this.quad);
      ping = pong;
      pong = (pong + 1) % 2;
    }

    return pingPong[ping];

    // vertical
    // @todo:

    // normalize
    // @todo:
  }
}
