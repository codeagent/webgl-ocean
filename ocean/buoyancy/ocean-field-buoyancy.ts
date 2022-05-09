import { vec3 } from 'gl-matrix';

import { OceanField } from '../ocean-field';
import { PointsSampler } from '../sampler';
import { FloatingBody } from './floating-body';
import { RigidBodyInterface } from './rigid-body.interface';

export interface FloatingBodyOptions {
  submergeDepth: number;
  buoyancyStrengh: number;
  waterDrag: number;
  waterAngularDrag: number;
  gravity: vec3;
}

export const floatingBodyDefaultOptions: FloatingBodyOptions = {
  submergeDepth: 1,
  buoyancyStrengh: 0.75,
  waterDrag: 1.0,
  waterAngularDrag: 0.75,
  gravity: vec3.fromValues(0.0, -9.8, 0.0),
};

export class OceanFieldBuoyancy {
  public readonly bodies = new Set<FloatingBody>();

  constructor(public readonly oceanField: OceanField) {}

  createFloatingBody(
    body: RigidBodyInterface,
    floaters: vec3[],
    options: Partial<FloatingBodyOptions> = {}
  ): FloatingBody {
    options = { ...floatingBodyDefaultOptions, ...options };

    const sampler = new PointsSampler(this.oceanField, floaters.length);
    const floatingBody = new FloatingBody(
      body,
      floaters,
      options.submergeDepth,
      options.buoyancyStrengh,
      options.waterDrag,
      options.waterAngularDrag,
      options.gravity,
      sampler
    );
    this.bodies.add(floatingBody);

    return floatingBody;
  }

  update() {
    for (const body of this.bodies) {
      body.applyForces();
    }
  }

  destroy(body: FloatingBody) {
    body.sampler.dispose();
    if (body.sample) {
      body.sample.release();
    }
    this.bodies.delete(body);
  }
}
