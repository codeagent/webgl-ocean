import { mat4, vec2, vec3 } from 'gl-matrix';

export type ShaderProgram = WebGLProgram;
export type Cubemap = WebGLTexture;
export type Texture2d = WebGLTexture;
export type VertexBuffer = WebGLBuffer;
export type IndexBuffer = WebGLBuffer;
export type RenderTarget = WebGLFramebuffer;

export interface VertexAttribute {
  semantics: string;
  slot: number;
  size: number;
  type: GLenum;
  offset: number;
  stride: number;
}

export interface Geometry {
  vao: WebGLVertexArrayObject;
  vbo: VertexBuffer;
  ebo: IndexBuffer;
  length: number;
  type: GLenum;
}

export interface Mesh {
  vertexFormat: VertexAttribute[];
  vertexData: ArrayBufferView;
  indexData: Uint32Array;
}

export enum TextureFiltering {
  Nearest = WebGL2RenderingContext.NEAREST,
  Linear = WebGL2RenderingContext.LINEAR,
}

export enum TextureMode {
  Repeat = WebGL2RenderingContext.REPEAT,
  Edge = WebGL2RenderingContext.CLAMP_TO_EDGE,
  Mirror = WebGL2RenderingContext.MIRRORED_REPEAT,
}

export class Gpu {
  get context() {
    return this._gl;
  }

  constructor(private readonly _gl: WebGL2RenderingContext) {
    _gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    // _gl.enable(WebGL2RenderingContext.CULL_FACE);
    // _gl.frontFace(WebGL2RenderingContext.CCW)
    _gl.clearDepth(1.0);
    _gl.lineWidth(2);
    _gl.disable(WebGL2RenderingContext.BLEND);
    _gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, 1);
    _gl.pixelStorei(WebGL2RenderingContext.PACK_ALIGNMENT, 1);
    _gl.viewport(0, 0, _gl.canvas.width, _gl.canvas.height);
    _gl.getExtension('EXT_color_buffer_float');
    _gl.getExtension('OES_texture_float_linear');
    _gl.clearColor(0.0, 0.0, 0.0, 0.0);
  }

  createGeometry(
    mesh: Mesh,
    type: GLenum = WebGL2RenderingContext.TRIANGLES
  ): Geometry {
    const vBuffer = this.createVertexBuffer(mesh.vertexData);
    const iBuffer = this.createIndexBuffer(mesh.indexData);

    const vao = this._gl.createVertexArray();
    this._gl.bindVertexArray(vao);
    for (const attribute of mesh.vertexFormat) {
      this._gl.enableVertexAttribArray(attribute.slot);
      this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vBuffer);
      if (attribute.type === WebGL2RenderingContext.FLOAT) {
        this._gl.vertexAttribPointer(
          attribute.slot,
          attribute.size,
          attribute.type,
          false,
          attribute.stride,
          attribute.offset
        );
      } else {
        this._gl.vertexAttribIPointer(
          attribute.slot,
          attribute.size,
          attribute.type,
          attribute.stride,
          attribute.offset
        );
      }
    }
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, iBuffer);
    this._gl.bindVertexArray(null);
    return {
      vao,
      vbo: vBuffer,
      ebo: iBuffer,
      length: mesh.indexData.length,
      type,
    };
  }

  createShaderProgram(vs: string, fs: string) {
    const gl = this._gl;
    const program = gl.createProgram();
    let shaders = [];
    try {
      for (const shader of [
        { type: WebGL2RenderingContext.VERTEX_SHADER, sourceCode: vs },
        { type: WebGL2RenderingContext.FRAGMENT_SHADER, sourceCode: fs },
      ]) {
        const shaderObject = gl.createShader(shader.type);
        gl.shaderSource(shaderObject, shader.sourceCode);
        gl.compileShader(shaderObject);
        if (
          !gl.getShaderParameter(
            shaderObject,
            WebGL2RenderingContext.COMPILE_STATUS
          )
        ) {
          const source = shader.sourceCode
            .split(/\n/)
            .map((line, no) => `${no + 1}:\t${line}`)
            .join('\n');

          throw new Error(
            `${
              shader.type === WebGL2RenderingContext.VERTEX_SHADER
                ? 'Vertex'
                : 'Fragment'
            } shader compile error: '${gl.getShaderInfoLog(
              shaderObject
            )}' \n${source}\n`
          );
        }
        gl.attachShader(program, shaderObject);
        shaders.push(shaderObject);
      }

      gl.linkProgram(program);
      if (
        !gl.getProgramParameter(program, WebGL2RenderingContext.LINK_STATUS)
      ) {
        throw new Error(
          `Unable to initialize the shader program: '${gl.getProgramInfoLog(
            program
          )}'`
        );
      }
    } catch (e) {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      throw e;
    }

    return program;
  }

  setProgram(program: ShaderProgram) {
    this._gl.useProgram(program);
  }

  setProgramVariable(
    program: ShaderProgram,
    name: string,
    type: 'uint' | 'int' | 'float',
    value: number
  ): void;
  setProgramVariable(
    program: ShaderProgram,
    name: string,
    type: 'vec2',
    value: vec2
  ): void;
  setProgramVariable(
    program: ShaderProgram,
    name: string,
    type: 'vec3',
    value: vec3
  ): void;
  setProgramVariable(
    program: ShaderProgram,
    name: string,
    type: 'mat4',
    value: mat4
  ): void;
  setProgramVariable(
    program: ShaderProgram,
    name: string,
    type: any,
    value: any
  ): void {
    const loc: WebGLUniformLocation = this._gl.getUniformLocation(
      program,
      name
    );
    if (!loc) {
      console.warn('Failed to find loc: ', name);
      return;
    }
    if (type === 'uint') {
      this._gl.uniform1ui(loc, value);
    } else if (type === 'int') {
      this._gl.uniform1i(loc, value);
    } else if (type === 'float') {
      this._gl.uniform1f(loc, value);
    } else if (type === 'vec2') {
      this._gl.uniform2fv(loc, value);
    } else if (type === 'vec3') {
      this._gl.uniform3fv(loc, value);
    } else if (type === 'mat4') {
      this._gl.uniformMatrix4fv(loc, false, value);
    }
  }

  setProgramTexture(
    program: ShaderProgram,
    name: string,
    texture: Texture2d,
    slot: number
  ) {
    const loc: WebGLUniformLocation = this._gl.getUniformLocation(
      program,
      name
    );
    if (!loc) {
      console.warn('Failed to find loc: ', name);
      return;
    }

    this._gl.uniform1i(loc, slot);
    this._gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + slot);
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
  }

  setProgramTextures(
    program: ShaderProgram,
    names: string[],
    textures: Texture2d[]
  ) {
    for (let i = 0; i < names.length; i++) {
      this.setProgramTexture(program, names[i], textures[i], i);
    }
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this._gl.viewport(x, y, width, height);
  }

  drawGeometry(geometry: Geometry) {
    this._gl.bindVertexArray(geometry.vao);
    this._gl.bindBuffer(
      WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
      geometry.ebo
    );
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, geometry.vbo);

    this._gl.drawElements(
      geometry.type ?? WebGL2RenderingContext.TRIANGLES,
      geometry.length,
      WebGL2RenderingContext.UNSIGNED_INT,
      0
    );
  }

  flush() {
    this._gl.flush();
  }

  finish() {
    this._gl.finish();
  }

  createFloatTexture(
    width: number,
    height: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): WebGLTexture {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      WebGL2RenderingContext.R32F,
      width,
      height,
      0,
      WebGL2RenderingContext.RED,
      WebGL2RenderingContext.FLOAT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);

    return texture;
  }

  createFloat2Texture(
    width: number,
    height: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): WebGLTexture {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      WebGL2RenderingContext.RG32F,
      width,
      height,
      0,
      WebGL2RenderingContext.RG,
      WebGL2RenderingContext.FLOAT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);

    return texture;
  }

  createFloat3Texture(
    width: number,
    height: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): WebGLTexture {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      WebGL2RenderingContext.RGB32F,
      width,
      height,
      0,
      WebGL2RenderingContext.RGB,
      WebGL2RenderingContext.FLOAT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);

    return texture;
  }

  createFloat4Texture(
    width: number,
    height: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): WebGLTexture {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
    this._gl.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      WebGL2RenderingContext.RGBA32F,
      width,
      height,
      0,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);

    return texture;
  }

  updateTexture(
    texture: WebGLTexture,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    data: ArrayBufferView
  ) {
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
    this._gl.texSubImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      0,
      0,
      width,
      height,
      format,
      type,
      data
    );
  }

  createRenderTarget(): RenderTarget {
    return this._gl.createFramebuffer();
  }

  attachTexture(target: RenderTarget, texture: Texture2d, slot: number) {
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, target);
    this._gl.framebufferTexture2D(
      WebGL2RenderingContext.FRAMEBUFFER,
      WebGL2RenderingContext.COLOR_ATTACHMENT0 + slot,
      WebGL2RenderingContext.TEXTURE_2D,
      texture,
      0
    );

    this._gl.drawBuffers(
      [...Array(slot + 1).keys()].map(
        (i) => WebGL2RenderingContext.COLOR_ATTACHMENT0 + i
      )
    );

    const status = this._gl.checkFramebufferStatus(
      WebGL2RenderingContext.FRAMEBUFFER
    );
    if (status !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Incomplete frame buffer, status: ${status}`);
    }
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, null);
  }

  attachTextures(target: RenderTarget, textures: Texture2d[]) {
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, target);
    const drawBuffers: GLenum[] = [];

    for (let i = 0; i < textures.length; i++) {
      this._gl.framebufferTexture2D(
        WebGL2RenderingContext.FRAMEBUFFER,
        WebGL2RenderingContext.COLOR_ATTACHMENT0 + i,
        WebGL2RenderingContext.TEXTURE_2D,
        textures[i],
        0
      );
      drawBuffers.push(WebGL2RenderingContext.COLOR_ATTACHMENT0 + i);
    }

    this._gl.drawBuffers(drawBuffers);

    const status = this._gl.checkFramebufferStatus(
      WebGL2RenderingContext.FRAMEBUFFER
    );
    if (status !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Incomplete frame buffer, status: ${status}`);
    }
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, null);
  }

  setRenderTarget(target: RenderTarget) {
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, target);
  }

  clearRenderTarget() {
    this._gl.clear(
      WebGL2RenderingContext.COLOR_BUFFER_BIT |
        WebGL2RenderingContext.DEPTH_BUFFER_BIT
    );
    // this._gl.clearBufferuiv(WebGL2RenderingContext.COLOR, 0, [0, 0, 0, 0]);
    // this._gl.clearBufferfv(WebGL2RenderingContext.DEPTH, 0, [1.0]);
  }

  destroyProgram(program: ShaderProgram) {
    this._gl.deleteProgram(program);
  }

  destroyGeometry(geometry: Geometry) {
    this._gl.deleteBuffer(geometry.ebo);
    this._gl.deleteBuffer(geometry.vbo);
    this._gl.deleteVertexArray(geometry.vao);
  }

  destroyRenderTarget(target: RenderTarget) {
    this._gl.deleteFramebuffer(target);
  }

  readValues(
    target: RenderTarget,
    values: Float32Array,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    slot: number
  ) {
    this._gl.bindFramebuffer(
      WebGL2RenderingContext.READ_FRAMEBUFFER,
      target ?? null
    );
    this._gl.readBuffer(WebGL2RenderingContext.COLOR_ATTACHMENT0 + slot);
    this._gl.readPixels(0, 0, width, height, format, type, values);
  }

  private createVertexBuffer(data: ArrayBufferView): VertexBuffer {
    const vbo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vbo);
    this._gl.bufferData(
      WebGL2RenderingContext.ARRAY_BUFFER,
      data,
      WebGL2RenderingContext.STATIC_DRAW
    );
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
    return vbo;
  }

  private createIndexBuffer(data: ArrayBufferView): IndexBuffer {
    const ebo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, ebo);
    this._gl.bufferData(
      WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
      data,
      WebGL2RenderingContext.STATIC_DRAW
    );
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
    return ebo;
  }
}
