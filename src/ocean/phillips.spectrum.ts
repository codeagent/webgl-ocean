import { Gpu } from '../graphics/gpu';
import { SpectrumSettings, SpectrumBase } from './spectrum';

import { vs, fs } from '../programs/phillips.glsl';

export interface PhillipsSpectrumSettings extends SpectrumSettings {
  alignment: number;
}

export class PhillipsSpectrum extends SpectrumBase<PhillipsSpectrumSettings> {
  constructor(gpu: Gpu, resolution: number, cascades: number) {
    super(gpu, resolution, cascades, vs, fs);
  }

  protected override fillUniformBuffer(
    buffer: Uint8Array,
    settings: PhillipsSpectrumSettings
  ): void {
    super.fillUniformBuffer(buffer, settings);
    const dataView = new DataView(buffer.buffer);
    dataView.setFloat32(216, settings.factor * 0.081, true);
    dataView.setFloat32(220, settings.alignment, true);
  }
}
