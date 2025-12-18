import { vec2 } from 'gl-matrix';

import { Geometry, Gpu, ShaderProgram, Texture2d } from '../graphics/gpu';
import { fs, vs } from '../programs/texture.glsl';

import { createQuad } from '../graphics/mesh';

export class TextureRenderer {
  private readonly shader: ShaderProgram;
  private readonly quad: Geometry;

  public constructor(private readonly gpu: Gpu) {
    this.shader = this.gpu.createShaderProgram(vs, fs);
    this.quad = this.gpu.createGeometry(createQuad());
  }

  public render(texture: Texture2d, pos: vec2, size: number) {
    this.gpu.setViewport(pos[0], pos[1], size, size);
    this.gpu.setProgram(this.shader);
    // this.gpu.setProgramTextureArray(this.shader, '_texture', texture, 0);
    this.gpu.setProgramTexture(this.shader, '_texture', texture, 0);
    this.gpu.setRenderTarget(null);
    this.gpu.drawGeometry(this.quad);
  }

  public dispose(): void {
    this.gpu.destroyGeometry(this.quad);
    this.gpu.destroyProgram(this.shader);
  }
}
