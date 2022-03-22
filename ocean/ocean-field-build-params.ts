import { vec2 } from 'gl-matrix';

export interface OceanFieldBuildParams {
  /**
   * The dimension of displacement field block in meters
   */
  size: number;

  /**
   * Size of generated texture. Must be power of 2
   */
  resolution: number;

  /**
   * Cascade scales
   */
  scales?: number[];

  /**
   * Wind vector. Module correspond to wind force.
   */
  wind?: vec2;

  /**
   * Importance of waves displacement. Should be <= 0.
   */
  croppiness?: number;

  /**
   * Parameter for waves motion. 0 means no wave motion
   */
  alignment?: number;

  /**
   * Acts as wave frequency flter. Waves with wavelength less than this quantity aren't synthesize
   */
  minWave?: number;

  /**
   * Variable for adjusting. Value should be between [0, 1]
   */
  strength?: number;

  /**
   * Seed of random generator
   */
  randomSeed?: number;
}

export const defaultBuildParams: OceanFieldBuildParams = {
  size: 100,
  resolution: 512,
  scales: [1, 0.054, 0.001],
  wind: vec2.fromValues(5.0, 5.0),
  croppiness: -1,
  alignment: 0.001,
  minWave: 0.0,
  strength: 1.0,
  randomSeed: 0,
};
