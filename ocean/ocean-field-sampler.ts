import { vec2, vec3 } from 'gl-matrix';

import {
  Gpu,
  ShaderProgram,
  Geometry,
  Mesh,
  TransformFeedback,
} from '../graphics';
import { OceanField } from './ocean-field';
import { vs, fs } from './programs/sampler';

export class OceanFieldSampler {
  private readonly gpu: Gpu;
  private readonly pointGeometry: Geometry;
  private readonly patchGeometry: Geometry;
  private readonly pointTransformFeedback: TransformFeedback;
  private readonly patchTransformFeedback: TransformFeedback;
  private readonly sampleProgram: ShaderProgram;

  constructor(
    private readonly oceanField: OceanField,
    private readonly samplePatchResolution: number = 4
  ) {
    this.gpu = oceanField['gpu'];
    this.pointGeometry = this.gpu.createGeometry(
      createPoint(),
      WebGL2RenderingContext.POINTS
    );

    this.patchGeometry = this.gpu.createGeometry(
      createPatch(this.samplePatchResolution, 1),
      WebGL2RenderingContext.POINTS
    );
    this.pointTransformFeedback = this.gpu.createTransformFeedback(12);
    this.patchTransformFeedback = this.gpu.createTransformFeedback(
      12 * this.samplePatchResolution ** 2
    );
    this.sampleProgram = this.gpu.createShaderProgram(vs, fs, ['outSample']);
  }

  async samplePoint(origin: vec2): Promise<vec3> {
    this.setProgram(this.sampleProgram, this.oceanField, origin, 1.0);
    this.gpu.beginTransformFeedback(
      this.pointTransformFeedback,
      WebGL2RenderingContext.POINTS
    );
    this.gpu.drawGeometry(this.pointGeometry);
    this.gpu.endTransformFeedback();

    try {
      await this.gpu.waitAsync();
      const buffer = new Float32Array(3);
      this.gpu.readTransformFeedback(this.pointTransformFeedback, [buffer]);
      return vec3.clone(buffer);
    } catch {
      console.warn('samplePoint: fenceSync timeout');
      return vec3.create();
    }
  }

  async samplePatch(origin: vec2, size: number = 10): Promise<vec3[]> {
    this.setProgram(this.sampleProgram, this.oceanField, origin, size);
    this.gpu.beginTransformFeedback(
      this.patchTransformFeedback,
      WebGL2RenderingContext.POINTS
    );
    this.gpu.drawGeometry(this.patchGeometry);
    this.gpu.endTransformFeedback();

    try {
      await this.gpu.waitAsync();
      const buffer = new Float32Array(3 * this.samplePatchResolution ** 2);
      this.gpu.readTransformFeedback(this.patchTransformFeedback, [buffer]);
      const patch: vec3[] = [];
      for (let i = 0; i < this.samplePatchResolution ** 2; i++) {
        const point = vec3.fromValues(
          buffer[i * 3],
          buffer[i * 3 + 1],
          buffer[i * 3 + 2]
        );
        patch.push(point);
      }
      return patch;
    } catch {
      console.warn('samplePatch: fenceSync timeout');
      return [];
    }
  }

  private setProgram(
    program: ShaderProgram,
    field: OceanField,
    origin: vec2,
    size: number
  ) {
    this.gpu.setProgram(program);
    this.gpu.setProgramTextures(
      program,
      ['dx_hy_dz_dxdz0', 'dx_hy_dz_dxdz1', 'dx_hy_dz_dxdz2'],
      [field.dataMaps[0], field.dataMaps[2], field.dataMaps[4]]
    );
    for (let i = 0; i < field.params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        program,
        `sizes[${i}]`,
        'float',
        field.params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        program,
        `croppinesses[${i}]`,
        'float',
        field.params.cascades[i].croppiness
      );
    }
    this.gpu.setProgramVariable(program, 'origin', 'vec2', origin);
    this.gpu.setProgramVariable(program, 'size', 'float', size);
  }
}

export const createPatch = (resolution: number, size: number): Mesh => {
  const vertices: vec2[] = [];
  const delta = size / (resolution - 1);
  const offset = vec2.fromValues(-size * 0.5, -size * 0.5);

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const vertex = vec2.fromValues(j * delta, i * delta);
      vec2.add(vertex, vertex, offset);
      vertices.push(vertex);
    }
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 2,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 8,
      },
    ],
    vertexData: Float32Array.from(vertices.map((v) => [...v]).flat()),
  };
};

export const createPoint = (): Mesh => {
  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 2,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 8,
      },
    ],
    vertexData: Float32Array.of(0.0, 0.0),
  };
};
