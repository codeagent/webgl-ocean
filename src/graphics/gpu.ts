import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

export type Texture2d = WebGLTexture;
export type Texture2dArray = WebGLTexture;
export type VertexBuffer = WebGLBuffer;
export type IndexBuffer = WebGLBuffer;
export type UniformBuffer = WebGLBuffer;
export type RenderTarget = WebGLFramebuffer;
export type Sync = WebGLSync;
export type Cubemap = WebGLTexture;
export type Sampler = WebGLSampler;

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
  ebo?: IndexBuffer;
  length: number;
  type: GLenum;
}

export interface ShaderProgram {
  program: WebGLProgram;
  shaders: WebGLShader[];
  uniforms: Record<string, WebGLUniformLocation>;
}

export interface Mesh {
  vertexFormat: VertexAttribute[];
  vertexData: ArrayBufferView & { length: number };
  indexData?: Uint32Array;
}

export interface Readback {
  framebuffer: WebGLFramebuffer;
  fence: WebGLSync;
  pbo: WebGLBuffer;
  size: number;
  status: GLenum;
}

export enum TextureFiltering {
  Nearest = WebGL2RenderingContext.NEAREST,
  Linear = WebGL2RenderingContext.LINEAR,
  LinearMipmapLinear = WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
}

export enum TextureMode {
  Repeat = WebGL2RenderingContext.REPEAT,
  Edge = WebGL2RenderingContext.CLAMP_TO_EDGE,
  Mirror = WebGL2RenderingContext.MIRRORED_REPEAT,
}

export interface DeviceAbility {
  maxAttachments: number;
}

export class Gpu {
  get context(): WebGL2RenderingContext {
    return this._gl;
  }

  get ablity(): DeviceAbility {
    return {
      maxAttachments: this._gl.getParameter(
        WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS
      ),
    };
  }

  constructor(private readonly _gl: WebGL2RenderingContext) {
    _gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    _gl.enable(WebGL2RenderingContext.CULL_FACE);
    _gl.depthFunc(WebGL2RenderingContext.LEQUAL);
    _gl.frontFace(WebGL2RenderingContext.CCW);
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
    const vao = this._gl.createVertexArray();
    this._gl.bindVertexArray(vao);

    const vbo = this.createVertexBuffer(
      mesh.vertexData,
      WebGL2RenderingContext.STATIC_DRAW
    );

    for (const attribute of mesh.vertexFormat) {
      this._gl.enableVertexAttribArray(attribute.slot);
      this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vbo);
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

    const geometry: Geometry = {
      vao,
      vbo,
      length: 0,
      type,
    };

    if (mesh.indexData) {
      const ebo = this.createIndexBuffer(mesh.indexData);
      geometry.length = mesh.indexData.length;
      geometry.ebo = ebo;
      this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, ebo);
    } else {
      const components = mesh.vertexFormat.reduce(
        (components, attribute) => components + attribute.size,
        0
      );
      geometry.length = mesh.vertexData.length / components;
    }

    this._gl.bindVertexArray(null);
    return geometry;
  }

  createShaderProgram(
    vs: string,
    fs: string,
    feedbackVars?: string[]
  ): ShaderProgram {
    const gl = this._gl;
    const program = gl.createProgram();

    let shaders: WebGLShader[] = [];
    try {
      for (const shader of [
        { type: WebGL2RenderingContext.VERTEX_SHADER, sourceCode: vs },
        { type: WebGL2RenderingContext.FRAGMENT_SHADER, sourceCode: fs },
      ]) {
        const shaderObject = gl.createShader(shader.type);
        gl.shaderSource(shaderObject, shader.sourceCode);
        gl.compileShader(shaderObject);
        const compileStatus = gl.getShaderParameter(
          shaderObject,
          WebGL2RenderingContext.COMPILE_STATUS
        );

        if (!compileStatus) {
          const source = shader.sourceCode
            .split(/\n/)
            .map((line: string, no: number) => `${no + 1}:\t${line}`)
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

      if (feedbackVars) {
        this._gl.transformFeedbackVaryings(
          program,
          feedbackVars,
          WebGL2RenderingContext.SEPARATE_ATTRIBS
        );
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

    return { program, shaders, uniforms: {} };
  }

  setProgram(program: ShaderProgram) {
    this._gl.useProgram(program.program);
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
    type: 'vec4',
    value: vec4
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
    program.uniforms[name] =
      program.uniforms[name] ??
      this._gl.getUniformLocation(program.program, name);

    if (!program.uniforms[name]) {
      console.warn('Failed to find loc: ', name);
      return;
    }
    if (type === 'uint') {
      this._gl.uniform1ui(program.uniforms[name], value);
    } else if (type === 'int') {
      this._gl.uniform1i(program.uniforms[name], value);
    } else if (type === 'float') {
      this._gl.uniform1f(program.uniforms[name], value);
    } else if (type === 'vec2') {
      this._gl.uniform2fv(program.uniforms[name], value);
    } else if (type === 'vec3') {
      this._gl.uniform3fv(program.uniforms[name], value);
    } else if (type === 'vec4') {
      this._gl.uniform4fv(program.uniforms[name], value);
    } else if (type === 'mat4') {
      this._gl.uniformMatrix4fv(program.uniforms[name], false, value);
    }
  }

  setProgramTexture(
    program: ShaderProgram,
    name: string,
    texture: Texture2d,
    slot: number,
    sampler: Sampler = null
  ) {
    program.uniforms[name] =
      program.uniforms[name] ??
      this._gl.getUniformLocation(program.program, name);

    if (!program.uniforms[name]) {
      console.warn('Failed to find loc: ', name);
      return;
    }

    this._gl.uniform1i(program.uniforms[name], slot);
    this._gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + slot);
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
    this._gl.bindSampler(slot, sampler);
  }

  setProgramTextureArray(
    program: ShaderProgram,
    name: string,
    texture: Texture2dArray,
    slot: number,
    sampler: Sampler = null
  ) {
    program.uniforms[name] =
      program.uniforms[name] ??
      this._gl.getUniformLocation(program.program, name);

    if (!program.uniforms[name]) {
      console.warn('Failed to find loc: ', name);
      return;
    }

    this._gl.uniform1i(program.uniforms[name], slot);
    this._gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + slot);
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D_ARRAY, texture);
    this._gl.bindSampler(slot, sampler);
  }

  setProgramCubemap(
    program: ShaderProgram,
    name: string,
    texture: Cubemap,
    slot: number
  ) {
    program.uniforms[name] =
      program.uniforms[name] ??
      this._gl.getUniformLocation(program.program, name);

    if (!program.uniforms[name]) {
      console.warn('Failed to find loc: ', name);
      return;
    }

    this._gl.uniform1i(program.uniforms[name], slot);
    this._gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + slot);
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_CUBE_MAP, texture);
  }

  setProgramTextures(
    program: ShaderProgram,
    name: string,
    textures: Texture2d[],
    offset: number = 0,
    sampler: Sampler = null
  ) {
    for (let i = 0; i < textures.length; i++) {
      this.setProgramTexture(
        program,
        `${name}[${i}]`,
        textures[i],
        i + offset,
        sampler
      );
    }
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this._gl.viewport(x, y, width, height);
  }

  drawGeometry(geometry: Geometry) {
    this._gl.bindVertexArray(geometry.vao);
    if (geometry.ebo) {
      this._gl.drawElements(
        geometry.type ?? WebGL2RenderingContext.TRIANGLES,
        geometry.length,
        WebGL2RenderingContext.UNSIGNED_INT,
        0
      );
    } else {
      this._gl.drawArrays(
        geometry.type ?? WebGL2RenderingContext.TRIANGLES,
        0,
        geometry.length
      );
    }
  }

  flush() {
    this._gl.flush();
  }

  createRGB8Texture(
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
      WebGL2RenderingContext.RGB,
      width,
      height,
      0,
      WebGL2RenderingContext.RGB,
      WebGL2RenderingContext.UNSIGNED_BYTE,
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

  createFloat2TextureArray(
    width: number,
    height: number,
    depth: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): Texture2dArray {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D_ARRAY, texture);
    this._gl.texImage3D(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      0,
      WebGL2RenderingContext.RG32F,
      width,
      height,
      depth,
      0,
      WebGL2RenderingContext.RG,
      WebGL2RenderingContext.FLOAT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D_ARRAY, null);

    return texture;
  }

  createFloat4TextureArray(
    width: number,
    height: number,
    depth: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): Texture2dArray {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D_ARRAY, texture);
    this._gl.texImage3D(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      0,
      WebGL2RenderingContext.RGBA32F,
      width,
      height,
      depth,
      0,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D_ARRAY, null);

    return texture;
  }

  createFloat4Cubemap(
    size: number,
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): WebGLTexture {
    const texture = this._gl.createTexture();
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_CUBE_MAP, texture);

    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_CUBE_MAP,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_CUBE_MAP,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_CUBE_MAP,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_CUBE_MAP,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );

    for (
      let face = WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X;
      face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z;
      face++
    ) {
      this._gl.texImage2D(
        face,
        0,
        WebGL2RenderingContext.RGBA32F,
        size,
        size,
        0,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.FLOAT,
        null
      );
    }

    return texture;
  }

  updateTexture(
    texture: WebGLTexture,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    data: TexImageSource
  );
  updateTexture(
    texture: WebGLTexture,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    data: ArrayBufferView
  );
  updateTexture(
    texture: WebGLTexture,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    data: any
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

  updateTexture2dArray(
    texture: WebGLTexture,
    width: number,
    height: number,
    layer: number,
    format: GLenum,
    type: GLenum,
    data: ArrayBufferView
  ) {
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D_ARRAY, texture);
    this._gl.texSubImage3D(
      WebGL2RenderingContext.TEXTURE_2D_ARRAY,
      0,
      0,
      0,
      layer,
      width,
      height,
      1,
      format,
      type,
      data
    );
  }

  generateMipmaps(
    texture: WebGLTexture,
    target: GLenum = WebGL2RenderingContext.TEXTURE_2D
  ): void {
    this._gl.bindTexture(target, texture);
    this._gl.generateMipmap(target);
  }

  createSampler(
    filter: TextureFiltering = TextureFiltering.Nearest,
    mode: TextureMode = TextureMode.Repeat
  ): Sampler {
    const sampler = this._gl.createSampler();
    this._gl.samplerParameteri(
      sampler,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      filter
    );
    this._gl.samplerParameteri(
      sampler,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      filter === TextureFiltering.Nearest
        ? TextureFiltering.Nearest
        : TextureFiltering.Linear
    );
    this._gl.samplerParameteri(
      sampler,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      mode
    );
    this._gl.samplerParameteri(
      sampler,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      mode
    );

    return sampler;
  }

  createUniformBlock(size: number, point: number): UniformBuffer {
    const ubo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.UNIFORM_BUFFER, ubo);
    this._gl.bufferData(
      WebGL2RenderingContext.UNIFORM_BUFFER,
      size,
      WebGL2RenderingContext.DYNAMIC_DRAW
    );
    this._gl.bindBufferBase(WebGL2RenderingContext.UNIFORM_BUFFER, point, ubo);
    this._gl.bindBuffer(WebGL2RenderingContext.UNIFORM_BUFFER, null);
    return ubo;
  }

  linkUniformBlock(program: ShaderProgram, point: number, name: string) {
    const blockIndex = this._gl.getUniformBlockIndex(program.program, name);

    if (blockIndex == WebGL2RenderingContext.INVALID_INDEX) {
      throw new Error(
        `Failed to find a block with the name '${name}' for the given program.`
      );
    }

    this._gl.uniformBlockBinding(program.program, blockIndex, point);
  }

  updateUniformBlock(
    ubo: UniformBuffer,
    data: ArrayBufferView,
    offset: number = 0
  ) {
    this._gl.bindBuffer(WebGL2RenderingContext.UNIFORM_BUFFER, ubo);
    this._gl.bufferSubData(WebGL2RenderingContext.UNIFORM_BUFFER, offset, data);
    this._gl.bindBuffer(WebGL2RenderingContext.UNIFORM_BUFFER, null);
  }

  updateGeometry(geometry: Geometry, vertexData: ArrayBufferView) {
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, geometry.vbo);
    this._gl.bufferSubData(WebGL2RenderingContext.ARRAY_BUFFER, 0, vertexData);
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
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

  attachTextureArray(
    target: RenderTarget,
    array: Texture2dArray,
    layers: number,
    offset: number = 0
  ) {
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, target);
    const drawBuffers: GLenum[] = [];

    for (let layer = 0; layer < layers; layer++) {
      this._gl.framebufferTextureLayer(
        WebGL2RenderingContext.FRAMEBUFFER,
        WebGL2RenderingContext.COLOR_ATTACHMENT0 + layer,
        array,
        0,
        layer + offset
      );

      drawBuffers.push(WebGL2RenderingContext.COLOR_ATTACHMENT0 + layer);
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

  setCullFace(face: GLenum) {
    this._gl.frontFace(face);
  }

  enableDepthWrite(flag: boolean) {
    this._gl.depthMask(flag);
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
    program.shaders.forEach((shader) => this._gl.deleteShader(shader));
    this._gl.deleteProgram(program.program);
  }

  destroyGeometry(geometry: Geometry) {
    this._gl.deleteBuffer(geometry.ebo);
    this._gl.deleteBuffer(geometry.vbo);
    this._gl.deleteVertexArray(geometry.vao);
  }

  destroyRenderTarget(target: RenderTarget) {
    this._gl.deleteFramebuffer(target);
  }

  destroyTexture(texture: WebGLTexture) {
    this._gl.deleteTexture(texture);
  }

  destroySampler(sampler: Sampler) {
    this._gl.deleteSampler(sampler);
  }

  destroyBuffer(buffer: WebGLBuffer) {
    this._gl.deleteBuffer(buffer);
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

  createReadback(size: number): Readback {
    const framebuffer = this._gl.createFramebuffer();
    const pbo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, pbo);
    this._gl.bufferData(
      WebGL2RenderingContext.PIXEL_PACK_BUFFER,
      size,
      WebGL2RenderingContext.STREAM_READ
    );

    return { fence: null, framebuffer, pbo, size, status: 0 };
  }

  requestReadback(
    readback: Readback,
    texture: WebGLTexture,
    width: number,
    height: number,
    layer: number
  ) {
    if (readback.fence) {
      console.warn("requestReadback: readback hasn't been finished yet");

      return;
    }

    this._gl.bindFramebuffer(
      WebGL2RenderingContext.READ_FRAMEBUFFER,
      readback.framebuffer
    );
    this._gl.framebufferTextureLayer(
      WebGL2RenderingContext.READ_FRAMEBUFFER,
      WebGL2RenderingContext.COLOR_ATTACHMENT0,
      texture,
      0,
      layer
    );
    this._gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, readback.pbo);
    this._gl.readPixels(
      0,
      0,
      width,
      height,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      0
    );
    readback.fence = this._gl.fenceSync(
      WebGL2RenderingContext.SYNC_GPU_COMMANDS_COMPLETE,
      0
    );
    this._gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, null);
    this._gl.flush();
  }

  readbackReady(readback: Readback): boolean {
    if (!readback.fence) {
      return true;
    }

    readback.status = this._gl.clientWaitSync(readback.fence, 0, 0);

    if (
      readback.status === WebGL2RenderingContext.ALREADY_SIGNALED ||
      readback.status === WebGL2RenderingContext.CONDITION_SATISFIED
    ) {
      this._gl.deleteSync(readback.fence);
      readback.fence = null;

      return true;
    }

    return false;
  }

  getReadbackValues(readback: Readback, data: Float32Array) {
    this._gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, readback.pbo);
    this._gl.getBufferSubData(
      WebGL2RenderingContext.PIXEL_PACK_BUFFER,
      0,
      data
    );
    this._gl.bindBuffer(WebGL2RenderingContext.PIXEL_PACK_BUFFER, null);
  }

  destroyReadback(readback: Readback) {
    this._gl.deleteFramebuffer(readback.framebuffer);
    this._gl.deleteBuffer(readback.pbo);
  }

  private createVertexBuffer(data: number, usage: GLenum): VertexBuffer;
  private createVertexBuffer(
    data: ArrayBufferView,
    usage: GLenum
  ): VertexBuffer;
  private createVertexBuffer(data: any, usage: GLenum): VertexBuffer {
    const vbo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vbo);
    this._gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, data, usage);
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
