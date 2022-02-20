import { vec2 } from 'gl-matrix';

import { createButterflyTexture } from './butterfly';
import {
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
  Geometry,
  quad,
} from '../graphics';
import { DisplacementField } from './displacement-field';

import { vs as h0vs, fs as h0fs } from './programs/h0';

export interface DisplacementFieldBuildParams {
  /**
   * The dimension of displacement field block in meters
   */
  size: number;

  /**
   * Size of generated texture. Must be power of 2
   */
  subdivisions: number;

  /**
   * Wind vector. Module correspond to wind force.
   */
  wind: vec2;

  /**
   * Importance of waves displacement. Should be <= 0.
   */
  croppiness: number;

  /**
   * Variable for adjusting. Value should be between [0, 1]
   */
  strength: number;
}

export class DisplacementFieldFactory {
  private readonly quad: Geometry;
  private readonly frameBuffer: RenderTarget;
  private readonly noiseTexture = new Map<number, Texture2d>();
  private readonly butterflyTexture = new Map<number, Texture2d>();
  private readonly h0Program: ShaderProgram;

  constructor(private readonly gpu: Gpu) {
    this.quad = this.gpu.createGeometry(quad);
    this.frameBuffer = this.gpu.createRenderTarget();
    this.h0Program = this.gpu.createShaderProgram(h0vs, h0fs);
  }

  build(params: DisplacementFieldBuildParams): DisplacementField {
    return new DisplacementField(
      this.gpu,
      this.getH0Texture(params),
      this.getButterflyTexture(params.subdivisions),
      this.quad,
      params
    );
  }

  private getNoiseTexture(size: number): Texture2d {
    if (!this.noiseTexture.has(size)) {
      const data = this.getNoise2d(size);
      const texture = this.gpu.createFloat4Texture(size, size);
      this.gpu.updateTexture(
        texture,
        size,
        size,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        data
      );
      this.noiseTexture.set(size, texture);
    }
    return this.noiseTexture.get(size);
  }

  private getH0Texture(params: DisplacementFieldBuildParams): Texture2d {
    const texture = this.gpu.createFloat4Texture(
      params.subdivisions,
      params.subdivisions
    );

    this.gpu.attachTexture(this.frameBuffer, texture, 0);
    this.gpu.setRenderTarget(this.frameBuffer);
    this.gpu.setViewport(0, 0, params.subdivisions, params.subdivisions);
    this.gpu.clearRenderTarget();

    this.gpu.setProgram(this.h0Program);
    this.gpu.setProgramTexture(
      this.h0Program,
      'noise',
      this.getNoiseTexture(params.subdivisions),
      0
    );
    this.gpu.setProgramVariable(
      this.h0Program,
      'subdivisions',
      'uint',
      params.subdivisions
    );
    this.gpu.setProgramVariable(this.h0Program, 'size', 'float', params.size);
    this.gpu.setProgramVariable(this.h0Program, 'wind', 'vec2', params.wind);
    this.gpu.setProgramVariable(
      this.h0Program,
      'A',
      'float',
      params.strength /* 0.081 * / (params.size * params.size)  */
    );

    this.gpu.drawGeometry(this.quad);
    this.gpu.setRenderTarget(null);

    return texture;
  }

  private getButterflyTexture(size: number) {
    if (!this.butterflyTexture.has(size)) {
      const texture = this.gpu.createFloat4Texture(Math.log2(size), size);
      this.gpu.updateTexture(
        texture,
        Math.log2(size),
        size,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        createButterflyTexture(size)
      );
      this.butterflyTexture.set(size, texture);
    }
    return this.butterflyTexture.get(size);
  }

  private getNoise2d(size: number) {
    return Float32Array.from(
      [...Array(size * size * 4)].map(() => Math.random())
    );
  }
}
