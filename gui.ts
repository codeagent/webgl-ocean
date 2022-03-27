import { vec2 } from 'gl-matrix';
import { cloneDeep, isEqual } from 'lodash-es';
import GUI from 'lil-gui';
import { Subject } from 'rxjs';

import { OceanFieldBuildParams } from './ocean';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';

export interface GuiParams extends OceanFieldBuildParams {
  geometryResolution: number;
  geometrySize: number;
  times: number;
}

export const defaultParams: GuiParams = {
  cascades: [
    {
      size: 100.0,
      strength: 2.0,
      croppiness: -1.5,
      minWave: 1.0e-3,
      maxWave: 1.0e3,
    },
    {
      size: 60.0,
      strength: 2.0,
      croppiness: -1.5,
      minWave: 1.0e-3,
      maxWave: 1.0e3,
    },
    {
      size: 6.0,
      strength: 2.0,
      croppiness: -1.5,
      minWave: 1.0e-3,
      maxWave: 1.0e3,
    },
  ],
  resolution: 256,
  wind: vec2.fromValues(4.5, 2.5),
  alignment: 1.0,
  foamSpreading: 1.0,
  foamContrast: 2.0,
  randomSeed: 0,
  geometryResolution: 256,
  geometrySize: 100,
  times: 1,
};

export class Gui {
  public get onChange$() {
    return this._onChange$.asObservable().pipe(debounceTime(1));
  }

  public readonly params: GuiParams = cloneDeep(defaultParams);

  private _onChange$ = new Subject<GuiParams>();
  private readonly gui: GUI;

  constructor(container: HTMLElement) {
    this.gui = new GUI({ container });
    this.addControls(this.gui);
    this.gui.onChange(() => this._onChange$.next(this.params));
  }

  private reset() {
    this.gui.reset();
  }

  private addControls(gui: GUI) {
    const tiles = [1, 2, 3, 4, 5];
    const resolutons = [...Array(6).keys()].map((r) => 1 << (r + 5));
    const colors = ['#c74440', '#388c46', '#2d70b3'];

    gui.add(this, 'reset').name('Reset');
    gui.add(this.params, 'resolution', resolutons).name('Map Resolution');
    gui
      .add(this.params, 'geometryResolution', resolutons)
      .name('Geometry resolution');
    gui.add(this.params, 'geometrySize', 0, 1000).step(1).name('Geometry size');
    gui.add(this.params, 'times', tiles).name('Tiles');

    const wind = gui.addFolder('Wind');
    wind.add(this.params.wind, '0', 0, 31).step(1).name('X');
    wind.add(this.params.wind, '1', 0, 31).step(1).name('Y');
    gui.add(this.params, 'alignment', 0, 4).step(0.1).name('Alignment');
    gui
      .add(this.params, 'foamSpreading', 0, 2)
      .step(0.1)
      .name('Foam spreading');
    gui.add(this.params, 'foamContrast', 0, 2).step(0.1).name('Foam contrast');
    gui.add(this.params, 'randomSeed', 0, 1024).step(1).name('Random seed');

    let i = 0;
    for (const cascade of this.params.cascades) {
      const group = gui.addFolder(`Cascade ${i}`);
      group.domElement.childNodes.item(0).style.color = colors[i++];

      group.add(cascade, 'size', 0, 1000.0).step(1).name('Size');
      group.add(cascade, 'croppiness', -2, 2).step(0.1).name('Croppiness');
      group.add(cascade, 'strength', 0, 10).step(0.1).name('Strength');
      group.add(cascade, 'minWave', 0, 1e3).step(1).name('Min wave length');
      group.add(cascade, 'maxWave', 0, 1e3).step(1).name('Max wave length');
    }
  }
}
