import { vec2 } from 'gl-matrix';

import { Geometry, Gpu, ShaderProgram, Texture2d } from './gpu';
import { vs as texturevs, fs as texturefs } from './programs/texture';
import quad from './quad';

export enum TextureType {
  Noise = 0,
  Butterfly = 1,
  H0 = 2,
  H0_STAR = 3,
  Hk = 4,
  DDX = 5,
  DDZ = 6,
  DX = 7,
  DZ = 8,
  DDXDX = 9,
  DDZDZ = 10,
  Normals = 11,
  Foam = 12,
}

export class TextureRenderer {
  private readonly textureShader: ShaderProgram;
  private readonly quad: Geometry;

  public constructor(private readonly gpu: Gpu) {
    this.textureShader = this.gpu.createShaderProgram(texturevs, texturefs);
    this.quad = this.gpu.createGeometry(quad);
  }

  render(pos: vec2, texture: Texture2d, type: TextureType) {
    this.gpu.setViewport(
      pos[0],
      pos[1],
      this.gpu.context.canvas.width * 0.1,
      this.gpu.context.canvas.width * 0.1
    );

    this.gpu.setProgram(this.textureShader);
    this.gpu.setProgramTexture(this.textureShader, 'texImage', texture, 0);
    this.gpu.setProgramVariable(this.textureShader, 'texType', 'uint', type);
    this.gpu.drawGeometry(this.quad);
  }
}
