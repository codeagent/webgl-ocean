import { Camera } from '../graphics/camera';

export interface CameraControllerInterface {
  readonly camera: Camera;
  update(dt: number): void;
  release(): void;
}
