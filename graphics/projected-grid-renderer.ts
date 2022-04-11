import { mat4, vec3 } from 'gl-matrix';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, switchMap, debounceTime } from 'rxjs/operators';
import { isEqual } from 'lodash-es';

import { Geometry, Gpu, Mesh, ShaderProgram } from './gpu';
import { Camera } from './camera';
import { vs as gridvs, fs as gridfs } from './programs/projected-grid';
import { OceanField } from '../ocean';
import { ThreadWorker } from '../thread';
// @ts-ignore:
import { createNDCGrid } from './mesh';

declare const createNDCGrid: (resolution: number) => Mesh;

export class ProjectedGridRenderer {
  private readonly shader: ShaderProgram;
  private readonly worker: ThreadWorker<number, Mesh>;
  private readonly resolution$ = new BehaviorSubject<number>(128);
  private readonly invViewProjMat = mat4.create();
  private geometry: Geometry;

  public constructor(private readonly gpu: Gpu) {
    this.shader = this.gpu.createShaderProgram(gridvs, gridfs);
    this.worker = new ThreadWorker<number, Mesh>((input) =>
      createNDCGrid(input)
    );

    this.resolution$
      .pipe(
        debounceTime(10),
        distinctUntilChanged(isEqual),
        switchMap((e) => this.worker.process(e))
      )
      .subscribe((mesh: Mesh) => {
        if (this.geometry) {
          this.gpu.destroyGeometry(this.geometry);
        }
        this.geometry = this.gpu.createGeometry(mesh, WebGL2RenderingContext.LINES);
      });
  }

  public render(camera: Camera, oceanField: OceanField) {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );

    this.gpu.setProgram(this.shader);
    mat4.multiply(this.invViewProjMat, camera.projection, camera.view);
    mat4.invert(this.invViewProjMat, this.invViewProjMat);
    this.gpu.setProgramVariable(
      this.shader,
      'invViewProjMat',
      'mat4',
      this.invViewProjMat
    );
    this.gpu.setProgramVariable(this.shader, 'viewMat', 'mat4', camera.view);
    this.gpu.setProgramVariable(
      this.shader,
      'projMat',
      'mat4',
      camera.projection
    );
    this.gpu.setProgramVariable(this.shader, 'pos', 'vec3', camera.position);

    if (this.geometry) {
      this.gpu.drawGeometry(this.geometry);
    }
  }

  public getResolution(): number {
    return this.resolution$.value;
  }

  public setResolution(resolution: number): void {
    this.resolution$.next(resolution);
  }
}
