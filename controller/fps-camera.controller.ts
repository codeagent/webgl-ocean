import { quat, vec2, vec3 } from 'gl-matrix';
import { fromEvent, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Key } from 'ts-keycode-enum';

import { Camera } from '../graphics';
import { CameraControllerInterface } from './camera-controller-interface';
import { MouseButton } from './mouse-button';

export class FpsCameraController implements CameraControllerInterface {
  private click: vec2 = vec2.create();
  private target: HTMLElement;
  private up$ = new Subject<void>();
  private release$ = new Subject<void>();
  private readonly keys = new Map<Key, boolean>();

  private velocity = vec3.create();
  private yaw = 0.0;
  private pitch = 0.0;
  private q = quat.create();
  private active = false;

  constructor(
    private canvas: HTMLCanvasElement,
    public readonly camera: Camera,
    private speed = 1.0e2,
    public sensibility = 1.0e-2
  ) {
    this.canvas = canvas;

    fromEvent(this.canvas, 'contextmenu')
      .pipe(takeUntil(this.release$))
      .subscribe((e: MouseEvent) => (e.preventDefault(), false));

    fromEvent(this.canvas, 'mousedown')
      .pipe(
        takeUntil(this.release$),
        filter((e: MouseEvent) => e.button === MouseButton.Right)
      )
      .subscribe((e: MouseEvent) => this.mouseDown(e));

    fromEvent(this.canvas, 'wheel')
      .pipe(
        takeUntil(this.release$),
        filter(() => this.active)
      )
      .subscribe((e: WheelEvent) => this.scroll(e));

    fromEvent(document, 'keydown')
      .pipe(
        takeUntil(this.release$),
        filter((e: KeyboardEvent) => !this.keys.has(e.keyCode))
      )
      .subscribe((e: KeyboardEvent) => {
        this.keys.set(e.keyCode, true);
      });

    fromEvent(document, 'keyup')
      .pipe(
        takeUntil(this.release$),
        filter((e: KeyboardEvent) => this.keys.has(e.keyCode))
      )
      .subscribe((e: KeyboardEvent) => {
        this.keys.delete(e.keyCode);
      });
  }

  update(dt: number) {
    this.move(dt);
  }

  release() {
    this.release$.next();
  }

  private mouseDown(e: MouseEvent) {
    this.target = e.target as HTMLElement;
    this.target.style.cursor = 'crosshair';

    this.yaw = signedAngle(x, this.camera.right, y);
    this.pitch = signedAngle(y, this.camera.up, this.camera.right);
    this.click = vec2.fromValues(e.pageX, e.pageY);
    this.active = true;

    fromEvent(document, 'mousemove')
      .pipe(takeUntil(this.up$))
      .subscribe((e: MouseEvent) => this.mouseMove(e));

    fromEvent(document, 'mouseup')
      .pipe(takeUntil(this.up$))
      .subscribe(() => this.mouseUp());

    e.preventDefault();
  }

  private mouseMove(e: MouseEvent) {
    const dx = (this.click[0] - e.pageX) * this.sensibility;
    const dy = (this.click[1] - e.pageY) * this.sensibility;

    quat.identity(this.q);
    quat.rotateY(this.q, this.q, this.yaw + dx);
    quat.rotateX(this.q, this.q, this.pitch + dy);
    this.camera.rotation = this.q;
  }

  private mouseUp() {
    this.up$.next();
    this.target.style.cursor = 'default';
    this.active = false;
  }

  private scroll(e: WheelEvent) {
    if (e.deltaY < 0) {
      this.speed = this.speed * 1.2;
    } else {
      this.speed = this.speed * 0.8;
    }
  }

  private move(dt: number) {
    vec3.set(this.velocity, 0, 0, 0);
    if (this.keys.has(Key.W)) {
      vec3.add(this.velocity, this.velocity, this.camera.forward);
    }
    if (this.keys.has(Key.S)) {
      vec3.sub(this.velocity, this.velocity, this.camera.forward);
    }
    if (this.keys.has(Key.A)) {
      vec3.sub(this.velocity, this.velocity, this.camera.right);
    }
    if (this.keys.has(Key.D)) {
      vec3.add(this.velocity, this.velocity, this.camera.right);
    }
    if (this.keys.has(Key.Q)) {
      vec3.sub(this.velocity, this.velocity, y);
    }
    if (this.keys.has(Key.E)) {
      vec3.add(this.velocity, this.velocity, y);
    }
    const length = vec3.len(this.velocity);
    if (length > 0) {
      vec3.scale(this.velocity, this.velocity, length * this.speed);
    }

    this.camera.position = vec3.scaleAndAdd(
      this.camera.position,
      this.camera.position,
      this.velocity,
      dt
    );
  }
}

const signedAngle = (
  (cross: vec3) =>
  (a: vec3, b: vec3, look: vec3): number => {
    vec3.cross(cross, a, b);
    const angle = vec3.angle(a, b);
    return vec3.dot(cross, look) > 0 ? angle : 2 * Math.PI - angle;
  }
)(vec3.create());

const x = vec3.fromValues(1.0, 0.0, 0.0);
const y = vec3.fromValues(0.0, 1.0, 0.0);
