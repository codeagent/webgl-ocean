import { mat4, vec3 } from 'gl-matrix';
import {
  Cubemap,
  Geometry,
  Gpu,
  RenderTarget,
  ShaderProgram,
  Texture2d,
  TextureFiltering,
} from './gpu';


import { vs, fs } from '../programs/sky.glsl';
import { createCube } from './mesh';

export interface SkyboxSettings {
  size: number;
}

export class Skybox {
  private readonly framebuffer: RenderTarget;
  private readonly program: ShaderProgram;
  private readonly cube: Geometry;

  private readonly faces = [
    {
      target: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
      forward: vec3.fromValues(1, 0, 0),
      up: vec3.fromValues(0, -1, 0),
    },
    {
      target: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
      forward: vec3.fromValues(-1, 0, 0),
      up: vec3.fromValues(0, -1, 0),
    },
    {
      target: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
      forward: vec3.fromValues(0, 1, 0),
      up: vec3.fromValues(0, 0, 1),
    },
    {
      target: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      forward: vec3.fromValues(0, -1, 0),
      up: vec3.fromValues(0, 0, -1),
    },
    {
      target: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
      forward: vec3.fromValues(0, 0, 1),
      up: vec3.fromValues(0, -1, 0),
    },
    {
      target: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      forward: vec3.fromValues(0, 0, -1),
      up: vec3.fromValues(0, -1, 0),
    },
  ];

  constructor(private readonly gpu: Gpu) {
    this.framebuffer = this.createFramebuffer();
    this.program = this.createProgram();
    this.cube = this.createGeometry();
  }

  generate(cubemap: Cubemap, settings: SkyboxSettings) {
    this.gpu.setViewport(0, 0, settings.size, settings.size);
    this.gpu.setProgram(this.program);
    this.gpu.setRenderTarget(this.framebuffer);
    const projMat = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100);
    this.gpu.setProgramVariable(this.program, 'projMat', 'mat4', projMat);
    const viewMat = mat4.create();
    const origin = vec3.create();

    this.gpu.setCullFace(WebGL2RenderingContext.CW);

    for (const face of this.faces) {
      this.gpu.context.framebufferTexture2D(
        WebGL2RenderingContext.FRAMEBUFFER,
        WebGL2RenderingContext.COLOR_ATTACHMENT0,
        face.target,
        cubemap,
        0
      );
      mat4.lookAt(viewMat, origin, face.forward, face.up);
      this.gpu.setProgramVariable(this.program, 'viewMat', 'mat4', viewMat);
      this.gpu.drawGeometry(this.cube);
    }
    this.gpu.setCullFace(WebGL2RenderingContext.CCW);
    this.gpu.generateMipmaps(cubemap, WebGL2RenderingContext.TEXTURE_CUBE_MAP);
  }

  dispose() {
    this.gpu.destroyGeometry(this.cube);
    this.gpu.destroyProgram(this.program);
    this.gpu.destroyRenderTarget(this.framebuffer);
  }

  private createFramebuffer(): RenderTarget {
    return this.gpu.createRenderTarget();
  }

  private createProgram(): ShaderProgram {
    return this.gpu.createShaderProgram(vs, fs);
  }

  protected createGeometry(): Geometry {
    return this.gpu.createGeometry(createCube());
  }
}
