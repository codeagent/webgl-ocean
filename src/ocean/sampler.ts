import { vec3 } from 'gl-matrix';

export class TextureSampler {
  private readonly q11 = vec3.create();
  private readonly q12 = vec3.create();
  private readonly q21 = vec3.create();
  private readonly q22 = vec3.create();

  constructor(
    private readonly texture: Float32Array,
    private readonly size: number,
    private readonly components: number
  ) {}

  sampleLinear(u: number, v: number): vec3 {
    u = (u - 0.5 / this.size) % 1;
    v = (v - 0.5 / this.size) % 1;
    u = u < 0 ? 1.0 + u : u;
    v = v < 0 ? 1.0 + v : v;
    const x = u * this.size;
    const y = v * this.size;
    const x1 = Math.trunc(x);
    const y1 = Math.trunc(y);
    const x2 = (x1 + 1) % this.size;
    const y2 = (y1 + 1) % this.size;
    this.getTexel(this.q11, x1, y1);
    this.getTexel(this.q12, x1, y2);
    this.getTexel(this.q22, x2, y2);
    this.getTexel(this.q21, x2, y1);
    vec3.lerp(this.q11, this.q11, this.q21, x - x1);
    vec3.lerp(this.q12, this.q12, this.q22, x - x1);

    return vec3.lerp(this.q11, this.q11, this.q12, y - y1);
  }

  private getTexel(value: vec3, tx: number, ty: number) {
    const offset = (ty * this.size + tx) * this.components;
    vec3.set(
      value,
      this.texture[offset],
      this.texture[offset + 1],
      this.texture[offset + 2]
    );
  }
}
