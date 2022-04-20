import { loadObj } from '../loader';
import { Geometry, Gpu, Mesh, ShaderProgram } from './gpu';
import { Transform } from './transform';
import { mat4, vec3, vec4 } from 'gl-matrix';

import OBJ from '../objects/shapes';
import { createGrid } from './mesh';
import { Camera } from './camera';
import { vs, fs } from './programs/mesh';

export class Gizmos {
  private readonly sphereGeometry: Geometry;
  private readonly gridGeometry: Geometry;
  private readonly patchGeometry: Geometry;
  private readonly transform = new Transform();
  private readonly meshShader: ShaderProgram;

  constructor(private readonly gpu: Gpu) {
    this.meshShader = this.gpu.createShaderProgram(vs, fs);
    this.gridGeometry = this.gpu.createGeometry(
      createGrid(5.0),
      WebGL2RenderingContext.LINES
    );
    this.patchGeometry = this.gpu.createGeometry(
      createPatch(4),
      WebGL2RenderingContext.LINES
    );
    const obj = loadObj(OBJ);
    this.sphereGeometry = this.gpu.createGeometry(obj['sphere']);
  }

  drawGrid(camera: Camera) {
    this.gpu.setProgram(this.meshShader);
    this.gpu.setProgramVariable(
      this.meshShader,
      'worldMat',
      'mat4',
      mat4.create()
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'viewMat',
      'mat4',
      camera.view
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'projMat',
      'mat4',
      camera.projection
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'pos',
      'vec3',
      camera.position
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'albedo',
      'vec4',
      vec4.fromValues(1.0, 1.0, 1.0, 0.0)
    );

    this.gpu.drawGeometry(this.gridGeometry);
  }

  drawPointSample(
    camera: Camera,
    position: vec3,
    color: vec4 = vec4.fromValues(1.0, 0.25, 0.25, 1.0)
  ): void {
    this.transform.reset();
    this.transform.position = position;
    this.transform.scale = vec3.fromValues(0.2, 0.2, 0.2);

    this.gpu.setProgram(this.meshShader);
    this.gpu.setProgramVariable(
      this.meshShader,
      'worldMat',
      'mat4',
      this.transform.transform
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'viewMat',
      'mat4',
      camera.view
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'projMat',
      'mat4',
      camera.projection
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'pos',
      'vec3',
      camera.position
    );
    this.gpu.setProgramVariable(this.meshShader, 'albedo', 'vec4', color);
    this.gpu.drawGeometry(this.sphereGeometry);
  }

  drawPatchSample(camera: Camera, patch: vec3[], yOffset: number = 0.1): void {
    this.transform.reset();
    this.transform.position = vec3.fromValues(0.0, yOffset, 0.0);

    const buffer = Float32Array.from(patch.map((e) => [...e]).flat());
    this.gpu.updateGeometry(this.patchGeometry, buffer);
    this.gpu.setProgram(this.meshShader);
    this.gpu.setProgramVariable(
      this.meshShader,
      'worldMat',
      'mat4',
      this.transform.transform
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'viewMat',
      'mat4',
      camera.view
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'projMat',
      'mat4',
      camera.projection
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'pos',
      'vec3',
      camera.position
    );
    this.gpu.setProgramVariable(
      this.meshShader,
      'albedo',
      'vec4',
      vec4.fromValues(0.25, 1.0, 0.25, 0.0)
    );
    this.gpu.drawGeometry(this.patchGeometry);
  }
}

const createPatch = (resolution: number): Mesh => {
  const indices: number[] = [];
  const points: vec3[] = [];
  const colors: vec3[] = [];

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      if (i < resolution - 1 && j < resolution - 1) {
        const i0 = i * resolution + j;
        const i1 = i * resolution + j + 1;
        const i2 = (i + 1) * resolution + j + 1;
        const i3 = (i + 1) * resolution + j;
        indices.push(i0, i1, i1, i2, i2, i3, i3, i0);
      }

      points.push(vec3.create());
      if (i === 0 || j === 0 || i === resolution - 1 || j === resolution - 1) {
        colors.push(vec3.fromValues(1.0, 1.0, 0.0));
      } else {
        colors.push(vec3.fromValues(1.0, 0.5, 0.0));
      }
    }
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 12,
      },
      {
        semantics: 'color',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 2,
        offset: 12 * resolution ** 2,
        stride: 12,
      },
    ],

    vertexData: Float32Array.from(
      points
        .concat(colors)
        .map((v) => [...v])
        .flat()
    ),
    indexData: Uint32Array.from(indices),
  };
};
