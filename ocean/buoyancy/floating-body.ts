import { vec2, vec3 } from 'gl-matrix';

import { PointsSampler, Sample, SampleStatus } from '../sampler';
import { RigidBodyInterface } from './rigid-body.interface';

export class FloatingBody {
  public readonly world: vec3[] = [];
  public readonly points: vec2[] = [];
  public sampled: vec3[] | null = null;
  public sample: Sample<vec3[]> = null;

  constructor(
    public readonly body: RigidBodyInterface,
    public readonly floaters: vec3[],
    public readonly submergeDepth: number,
    public readonly buoyancyStrength: number,
    public readonly waterDrag: number,
    public readonly waterAngularDrag: number,
    public readonly gravity: vec3,
    public readonly sampler: PointsSampler
  ) {
    this.floaters.forEach(() => {
      this.world.push(vec3.create());
      this.points.push(vec2.create());
    });
  }

  applyForces(): void {
    if (!this.sample) {
      this.floaters.forEach((floater, i) => {
        vec3.transformMat4(this.world[i], floater, this.body.transform);
        vec2.set(this.points[i], this.world[i][0], this.world[i][2]);
      });
      this.sample = this.sampler.sample(...this.points);
    } else {
      const status = this.sample.status();
      if (status !== SampleStatus.Pending) {
        if (status === SampleStatus.Complete) {
          this.sampled = this.sample.outcome();
        }
        this.sample.release();
        this.sample = null;
      }
    }

    if (this.sampled) {
      this.applyForcesInternal(this.sampled, this.world);
    }
  }

  private applyForcesInternal(sampled: vec3[], world: vec3[]) {
    const center = vec3.create();
    for (let i = 0; i < this.floaters.length; i++) {
      if (sampled[i][1] <= world[i][1]) {
        continue;
      }
      const submerging = Math.min(
        Math.max((sampled[i][1] - world[i][1]) / this.submergeDepth, 0.0),
        1.0
      );

      this.body.applyForce(
        vec3.scale(
          vec3.create(),
          this.gravity,
          -this.body.mass * submerging * this.buoyancyStrength
        ),
        this.floaters[i]
      );
      this.body.applyForce(
        vec3.scale(
          vec3.create(),
          this.body.velocity,
          -this.waterDrag * submerging
        ),
        center
      );
      this.body.applyTorque(
        vec3.scale(
          vec3.create(),
          this.body.omega,
          -this.waterAngularDrag * submerging
        )
      );
    }
  }
}
