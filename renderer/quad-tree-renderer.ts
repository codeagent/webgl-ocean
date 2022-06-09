import { mat4, vec3 } from 'gl-matrix';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { distinctUntilChanged, switchMap, debounceTime } from 'rxjs/operators';
import { isEqual } from 'lodash-es';
import { filter, takeUntil } from 'rxjs/operators';
import { Key } from 'ts-keycode-enum';

import { Geometry, Gpu, Mesh, ShaderProgram, Camera } from '../graphics';
import { OceanField } from '../ocean';
import { ThreadWorker } from '../thread';

import vs from './programs/tile-vertex.glsl';
import fs from './programs/fragment.glsl';

// @ts-ignore:
import { createPlane } from './mesh';
import { AABB } from './aabb';
import { Frustum } from './frustum';

declare const createPlane: (resolution: number) => Mesh;

export interface QuadTreeOceanRendererSettings {
  size: number;
  maxTiers: number;
  minWaterLevel: number;
  maxWaterLevel: number;
  tileResolution: number;
  distanceFactor: number;
}

const defaultSettings: Readonly<QuadTreeOceanRendererSettings> = {
  size: 1000.0,
  maxTiers: 8,
  minWaterLevel: -1.0,
  maxWaterLevel: 1.0,
  tileResolution: 32,
  distanceFactor: 0.5,
};

interface Tile {
  aabb: AABB;
  level: number;
}

export class QuadTreeOceanRenderer {
  private readonly shader: ShaderProgram;
  private readonly worker: ThreadWorker<number, Mesh>;
  private readonly settings$ =
    new BehaviorSubject<QuadTreeOceanRendererSettings>({
      ...defaultSettings,
    });
  private geometry: Geometry;
  private frustum: Frustum;
  private camera: Camera;

  public constructor(private readonly gpu: Gpu) {
    this.shader = this.gpu.createShaderProgram(vs, fs);
    this.worker = new ThreadWorker<number, Mesh>((resolution) => {
      const cache: Map<number, Mesh> =
        self['tileOceanRendererCache'] ??
        (self['tileOceanRendererCache'] = new Map<number, Mesh>());

      if (!cache.has(resolution)) {
        cache.set(resolution, createPlane(resolution));
      }

      return cache.get(resolution);
    });

    this.settings$
      .pipe(
        debounceTime(10),
        distinctUntilChanged(isEqual),
        switchMap((e: QuadTreeOceanRendererSettings) =>
          this.worker.process(e.tileResolution)
        )
      )
      .subscribe((mesh: Mesh) => {
        if (this.geometry) {
          this.gpu.destroyGeometry(this.geometry);
        }
        this.geometry = this.gpu.createGeometry(
          mesh,
          WebGL2RenderingContext.LINES
        );
      });

    fromEvent(document, 'mousedown')
      .pipe(filter((e: MouseEvent) => e.button === 0))
      .subscribe(() => {
        this.frustum.transform(this.camera.transform);
      });
  }

  public render(camera: Camera, oceanField: OceanField) {
    this.camera = camera;
    if (!this.frustum) {
      this.frustum = new Frustum(camera);
    } else {
      this.frustum.transform(camera.transform);
    }

    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );
    this.gpu.setProgram(this.shader);
    this.gpu.setProgramTextures(
      this.shader,
      [
        'dx_hy_dz_dxdz0',
        'sx_sz_dxdx_dzdz0',
        'dx_hy_dz_dxdz1',
        'sx_sz_dxdx_dzdz1',
        'dx_hy_dz_dxdz2',
        'sx_sz_dxdx_dzdz2',
      ],
      oceanField.dataMaps
    );
    for (let i = 0; i < oceanField.params.cascades.length; i++) {
      this.gpu.setProgramVariable(
        this.shader,
        `sizes[${i}]`,
        'float',
        oceanField.params.cascades[i].size
      );
      this.gpu.setProgramVariable(
        this.shader,
        `croppinesses[${i}]`,
        'float',
        oceanField.params.cascades[i].croppiness
      );
    }
    this.gpu.setProgramVariable(
      this.shader,
      'foamSpreading',
      'float',
      oceanField.params.foamSpreading
    );
    this.gpu.setProgramVariable(
      this.shader,
      'foamContrast',
      'float',
      oceanField.params.foamContrast
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
      const tiles = this.generateTiles(this.frustum);
      const settings = this.getSettings();
      console.log(tiles.length);

      for (const tile of tiles) {
        this.renderTile(tile, this.geometry, settings);
      }
    }
  }

  private renderTile(
    tile: Tile,
    geometry: Geometry,
    settings: QuadTreeOceanRendererSettings
  ) {
    const { aabb, level } = tile;
    const scale = settings.size / 2 ** level;
    const offset = vec3.fromValues(
      (aabb.min[0] + aabb.max[0]) * 0.5,
      0.0,
      (aabb.min[2] + aabb.max[2]) * 0.5
    );
    const transform = mat4.create();
    mat4.fromTranslation(transform, offset);

    this.gpu.setProgramVariable(this.shader, 'scale', 'float', scale);
    this.gpu.setProgramVariable(this.shader, 'worldMat', 'mat4', transform);
    this.gpu.drawGeometry(geometry);
  }

  private generateTiles(frustum: Frustum) {
    const { size, minWaterLevel, maxWaterLevel, distanceFactor, maxTiers } =
      this.getSettings();

    const queue: Tile[] = [
      {
        aabb: new AABB(
          vec3.fromValues(-size * 0.5, minWaterLevel, -size * 0.5),
          vec3.fromValues(size * 0.5, maxWaterLevel, size * 0.5)
        ),
        level: 0,
      },
    ];
    const tiles: Tile[] = [];

    while (queue.length) {
      const { aabb, level } = queue.shift();
      if (frustum.testAABB(aabb)) {
        const distance = aabb.distance(frustum.origin);
        const size = Math.abs(aabb.max[0] - aabb.min[0]);

        if (level === maxTiers || distance * distanceFactor > size) {
          tiles.push({ aabb, level });
        } else {
          // subdivide
          const aabb0 = new AABB(
            aabb.min,
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              maxWaterLevel,
              aabb.min[2] + size * 0.5
            )
          );
          const aabb1 = new AABB(
            vec3.fromValues(
              aabb.min[0],
              minWaterLevel,
              aabb.min[2] + size * 0.5
            ),
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              maxWaterLevel,
              aabb.max[2]
            )
          );
          const aabb2 = new AABB(
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              minWaterLevel,
              aabb.min[2] + size * 0.5
            ),
            aabb.max
          );
          const aabb3 = new AABB(
            vec3.fromValues(
              aabb.min[0] + size * 0.5,
              minWaterLevel,
              aabb.min[2]
            ),
            vec3.fromValues(
              aabb.max[0],
              maxWaterLevel,
              aabb.min[2] + size * 0.5
            )
          );
          queue.push(
            { aabb: aabb0, level: level + 1 },
            { aabb: aabb1, level: level + 1 },
            { aabb: aabb2, level: level + 1 },
            { aabb: aabb3, level: level + 1 }
          );
        }
      }
    }

    return tiles;
  }

  public getSettings(): Readonly<QuadTreeOceanRendererSettings> {
    return this.settings$.value;
  }

  public setSettings(settings: Partial<QuadTreeOceanRendererSettings>): void {
    this.settings$.next({ ...this.settings$.value, ...settings });
  }
}
