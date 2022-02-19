import { mat4, vec3, glMatrix } from 'gl-matrix';

import { Transform } from './transform';

export class Camera extends Transform {
  get view() {
    mat4.invert(this._view, mat4.clone(this.transform));
    return this._view;
  }

  get projection() {
    return this._projection;
  }

  protected _view: mat4 = mat4.create();
  protected _projection: mat4 = mat4.create();

  constructor(
    public readonly fov: number,
    public readonly aspect: number,
    public readonly near: number,
    public readonly far: number
  ) {
    super();
    mat4.perspective(
      this._projection,
      glMatrix.toRadian(this.fov),
      this.aspect,
      this.near,
      this.far
    );
  }

  lookAt(eye: vec3, at: vec3) {
    mat4.targetTo(this._view, eye, at, [0.0, 1.0, 0.0]);
    mat4.getTranslation(this._position, this._view);
    mat4.getRotation(this._rotation, this._view);
    this._dirty = true;
  }
}
