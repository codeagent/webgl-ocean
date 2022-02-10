import { Gpu, Texture2d } from './gpu';
import { HeightFieldBuildParams } from './height-field-factory';

export class HeightField {
  constructor(
    private readonly gpu: Gpu,
    private readonly h0Texture: Texture2d,
    private readonly butterflyTexture: Texture2d,
    public readonly params: HeightFieldBuildParams
  ) {}

  update(time: number): void {}

  download(data: Float32Array): void {}
}
