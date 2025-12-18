import { FolderApi, Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

import { Ocean } from './ocean/ocean';
import { OceanRenderer, SkyboxRenderer } from './renderer';
import { PhillipsSpectrum } from './ocean/phillips.spectrum';
import { Camera, Cubemap, Gizmos, Gpu, Skybox } from './graphics';
import { TextureRenderer } from './renderer/texture.renderer';
import { CameraControllerInterface } from './controller/camera-controller.interface';
import { vec2, vec3 } from 'gl-matrix';
import { FpsCameraController } from './controller/fps.camera-controller';
import { TextureFiltering } from './graphics/gpu';

const defaults = {
  speed: 1.0,
  spectrum: {
    cascades: 1,
    resolution: 128,
    size: 750,
    randomSeed: 2,
    wind: { x: -16, y: 0 },
    alignment: 0.5,
    factor: 1.0,
  },
  ocean: [
    {
      steepness: 1.3,
      foamOffset: -0.75,
      foamFalloff: 0.012,
    },
    {
      steepness: 1.3,
      foamOffset: -0.4,
      foamFalloff: 0.012,
    },
    {
      steepness: 1.0,
      foamOffset: 0.1,
      foamFalloff: 0.012,
    },
    {
      steepness: 1.0,
      foamOffset: -0.4,
      foamFalloff: 0.012,
    },
  ],
  renderer: {
    scale: 5000,
    resolution: 64,
    waterColor: '#00485c',
    foamColor: '#ffffff',
    foamIntensity: 1.0,
    breakingOffset: 0.012,
    breakingIntensity: 1.0,
    envColor: '#b0d6ff',
    tiles: 8,
    lodMix: 10,
    wired: false,
    fixed: true,
    distanceFactor: 0.9,
    minWaterLevel: -20.0,
    maxWaterLevel: 20.0,
    maxTiers: 10,
  },
};

let angle = 0;

export class Application {
  stat: string = '';
  tests: string = '';

  private params = cpy({} as typeof defaults, defaults);
  private readonly gpu: Gpu;
  private readonly gizmos: Gizmos;
  private ocean: Ocean;
  private spectrum: PhillipsSpectrum;
  private renderer: OceanRenderer;
  private debug: TextureRenderer;
  private skybox: Cubemap;
  private skyboxGenerator: Skybox;
  private skyboxRenderer: SkyboxRenderer;
  private camera: Camera;
  private controller: CameraControllerInterface;
  private fps: EssentialsPlugin.FpsGraphBladeApi;
  private pane: Pane;

  constructor(context: WebGL2RenderingContext) {
    this.gpu = new Gpu(context);
    this.gizmos = new Gizmos(this.gpu);
    this.createPane();
    this.createSpectrum();
    this.createOcean();

    this.createRenderer();
    this.createCamera();
  }

  step(t: number) {
    this.fps.begin();
    t *= this.params.speed;
    this.controller.update(0.016);
    this.ocean.generate(t);
    this.render();
    this.fps.end();
    this.stat = this.getStat(this.renderer);
  }

  dispose() {
    this.controller.release();
    this.renderer.dispose();
    this.debug.dispose();
    this.spectrum.dispose();
    this.ocean.dispose();
    this.gizmos.dispose();
    this.skyboxRenderer.dispose();
    this.skyboxGenerator.dispose();
    this.gpu.destroyTexture(this.skybox);
  }

  private render() {
    this.gpu.setViewport(
      0,
      0,
      this.gpu.context.canvas.width,
      this.gpu.context.canvas.height
    );
    this.gpu.setRenderTarget(null);
    this.gpu.clearRenderTarget();

    this.drawSky();
    this.drawOcean();
    this.drawGizmos();
    this.drawDebug();
  }

  private drawGizmos() {
    this.gizmos.drawGrid(this.camera);
    const r = 10;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const p = vec3.create();
    this.gizmos.drawSphere(this.camera, this.ocean.samplePoint(p, x, y), 1.0);
    this.gizmos.drawSphere(
      this.camera,
      this.ocean.samplePoint(p, -10, -10),
      1.0
    );
    this.gizmos.drawSphere(
      this.camera,
      this.ocean.samplePoint(p, 10, -10),
      1.0
    );
    this.gizmos.drawSphere(this.camera, this.ocean.samplePoint(p, 10, 10), 1.0);
    this.gizmos.drawSphere(
      this.camera,
      this.ocean.samplePoint(p, -10, 10),
      1.0
    );
    angle += 0.005;
  }

  private drawOcean() {
    this.renderer.render(this.camera, this.ocean);
  }

  private drawSky() {
    this.skyboxRenderer.render(this.camera, this.skybox);
  }

  private drawDebug() {
    this.debug.render(this.ocean.sss, vec2.fromValues(0, 0), 128);
  }

  private createPane() {
    this.pane = new Pane({ title: 'Parameters' });
    this.pane.element.parentElement.style.width = '266px';
    this.pane.registerPlugin(EssentialsPlugin);
    this.addCommonBindings(this.pane);
    this.addSpectrumBindings(this.pane);
    this.addOceanBindings(this.pane);
    this.addRendererBindings(this.pane);
  }

  private addCommonBindings(pane: Pane) {
    pane
      .addButton({
        title: 'Reset',
      })
      .on('click', () => this.onReset());
    this.fps = pane.addBlade({
      view: 'fpsgraph',
      label: 'FPS',
      rows: 2,
    }) as EssentialsPlugin.FpsGraphBladeApi;
    pane.addBinding(this.params, 'speed', { label: 'Speed', min: 0, max: 1 });

    pane.addBinding(this, 'stat', {
      label: 'Test resuts',
      readonly: true,
      multiline: false,
      rows: 1,
    });
  }

  private addSpectrumBindings(pane: Pane) {
    const folder = pane.addFolder({ title: 'Spectrum', expanded: true });
    const maxCascades = Math.trunc(this.gpu.ablity.maxAttachments / 2);

    defaults.spectrum.cascades = this.params.spectrum.cascades = maxCascades;
    const cascades = folder.addBinding(this.params.spectrum, 'cascades', {
      label: 'Cascades',
      options: Object.fromEntries(
        Array.from(new Array(maxCascades), (_, index) => [index + 1, index + 1])
      ),
    });
    const resolution = folder.addBinding(this.params.spectrum, 'resolution', {
      label: 'Resolution',
      options: {
        32: 32,
        64: 64,
        128: 128,
        256: 256,
        512: 512,
      },
    });
    folder.addBinding(this.params.spectrum, 'size', {
      label: 'Size',
      min: 1,
      max: 1300,
    });
    folder.addBinding(this.params.spectrum, 'wind', {
      label: 'Wind',
      picker: 'inline',
      x: { min: -20, max: 20 },
      y: { min: -20, max: 20 },
    });
    const seed = folder.addBinding(this.params.spectrum, 'randomSeed', {
      label: 'Random seed',
      min: 0,
      max: 100,
    });
    folder.addBinding(this.params.spectrum, 'alignment', {
      label: 'Alignment',
      step: 1.0e-2,
      min: 0,
      max: 10,
    });
    folder.addBinding(this.params.spectrum, 'factor', {
      label: 'Strength',
      min: 0,
      max: 4,
    });
    folder.on('change', (e) => {
      if (e.target == resolution || e.target == cascades) {
        this.resetOcean();

        if (e.target == cascades) {
          const oceanPane = pane.children
            .filter((child) => child instanceof FolderApi)
            .find((child) => child.title == 'Ocean');
          this.setOceanBindingsVisibility(oceanPane);
        }
      } else {
        if (e.target == seed) {
          this.spectrum.setRandomSeed(this.params.spectrum.randomSeed);
        }
        this.onSpectrumChange();
      }
    });
  }

  private addOceanBindings(pane: Pane) {
    const folder = pane.addFolder({ title: 'Ocean', expanded: false });

    for (let cascade = 0; cascade < 4; cascade++) {
      folder.addBinding(this.params.ocean[cascade], 'steepness', {
        label: `Steepness[${cascade}]`,
        min: 0,
        max: 4,
      });
      folder.addBinding(this.params.ocean[cascade], 'foamOffset', {
        label: `Foam offset[${cascade}]`,
        min: -1,
        max: 0,
      });
      folder.addBinding(this.params.ocean[cascade], 'foamFalloff', {
        label: `Foam falloff[${cascade}]`,
        min: 0,
        max: 1e-1,
        step: 1e-4,
      });

      if (cascade != 3) {
        folder.addBlade({ view: 'separator' });
      }
    }

    this.setOceanBindingsVisibility(folder);

    folder.on('change', () => {
      this.onOceanChange();
    });
  }

  private setOceanBindingsVisibility(folder: FolderApi) {
    folder.children.forEach((child) => (child.hidden = true));
    folder.children
      .slice(0, this.params.spectrum.cascades * 4)
      .forEach((child) => (child.hidden = false));
  }

  private addRendererBindings(pane: Pane) {
    const folder = pane.addFolder({ title: 'Renderer', expanded: true });
    folder.addBinding(this.params.renderer, 'resolution', {
      label: 'Resolution',
      options: {
        32: 32,
        64: 64,
        128: 128,
        256: 256,
        512: 512,
      },
    });
    folder.addBinding(this.params.renderer, 'scale', {
      label: 'Scale',
      min: 1,
      max: 10000,
    });
    folder.addBinding(this.params.renderer, 'lodMix', {
      label: 'LOD mix',
      min: 0.5,
      max: 10,
    });
    folder.addBinding(this.params.renderer, 'distanceFactor', {
      label: 'Distance factor',
      min: 0.5,
      max: 4,
    });
    folder.addBinding(this.params.renderer, 'maxTiers', {
      label: 'Max tiers',
      min: 1,
      max: 10,
      step: 1,
    });
    folder.addBinding(this.params.renderer, 'minWaterLevel', {
      label: 'Min water level',
      min: -50,
      max: 0,
      step: 0.1,
    });
    folder.addBinding(this.params.renderer, 'maxWaterLevel', {
      label: 'Max water level',
      min: 0,
      max: 50,
      step: 0.1,
    });
    folder.addBinding(this.params.renderer, 'waterColor', {
      label: 'Water color',
      picker: 'inline',
    });
    folder.addBinding(this.params.renderer, 'foamColor', {
      label: 'Foam color',
      picker: 'inline',
    });
    folder.addBinding(this.params.renderer, 'foamIntensity', {
      label: `Foam intensity`,
      min: 0,
      max: 1,
      step: 1e-4,
    });
    folder.addBinding(this.params.renderer, 'breakingOffset', {
      label: `Breaking offset`,
      min: 0,
      max: 1.0,
      step: 1e-4,
    });
    folder.addBinding(this.params.renderer, 'breakingIntensity', {
      label: `Breaking intensity`,
      min: 0,
      max: 1.0,
      step: 1e-4,
    });
    folder.addBinding(this.params.renderer, 'envColor', {
      label: 'Sky color',
      picker: 'inline',
    });
    folder.addBinding(this.params.renderer, 'wired', {
      label: 'Wired',
    });

    folder.on('change', () => {
      this.onRendererSettingsChange();
    });
  }

  private createSpectrum() {
    this.spectrum = new PhillipsSpectrum(
      this.gpu,
      this.params.spectrum.resolution,
      this.params.spectrum.cascades
    );
    this.spectrum.setRandomSeed(this.params.spectrum.randomSeed);
    this.onSpectrumChange();
  }

  private createOcean() {
    this.ocean = new Ocean(this.gpu, this.spectrum);
    this.onOceanChange();
  }

  private createRenderer() {
    this.renderer = new OceanRenderer(this.gpu);
    this.debug = new TextureRenderer(this.gpu);
    this.skyboxRenderer = new SkyboxRenderer(this.gpu);
    this.skyboxGenerator = new Skybox(this.gpu);
    this.skybox = this.gpu.createFloat4Cubemap(1024, TextureFiltering.Linear);
    this.skyboxGenerator.generate(this.skybox, { size: 1024 });
    this.onRendererSettingsChange();
  }

  private createCamera() {
    this.camera = new Camera(
      45.0,
      this.gpu.context.canvas.width / this.gpu.context.canvas.height,
      1.0,
      1.0e4
    );
    this.camera.lookAt(vec3.fromValues(-30, 25, -30), vec3.fromValues(0, 0, 0));
    this.controller = new FpsCameraController(
      this.gpu.context.canvas as HTMLCanvasElement,
      this.camera
    );
  }

  private onSpectrumChange() {
    this.spectrum.generate({
      wind: vec2.fromValues(
        this.params.spectrum.wind.x,
        this.params.spectrum.wind.y
      ),
      alignment: this.params.spectrum.alignment,
      factor: this.params.spectrum.factor,
      size: this.params.spectrum.size,
    });
  }

  private onOceanChange() {
    this.ocean.setSettings({ ...this.params.ocean });
  }

  private onRendererSettingsChange() {
    this.renderer.setSettings({
      envColor: hex2rgb(this.params.renderer.envColor),
      foamColor: hex2rgb(this.params.renderer.foamColor),
      waterColor: hex2rgb(this.params.renderer.waterColor),
      resolution: this.params.renderer.resolution,
      scale: this.params.renderer.scale,
      lodMix: this.params.renderer.lodMix,
      maxTiers: this.params.renderer.maxTiers,
      minWaterLevel: this.params.renderer.minWaterLevel,
      maxWaterLevel: this.params.renderer.maxWaterLevel,
      distanceFactor: this.params.renderer.distanceFactor,
      fixed: this.params.renderer.fixed,
      wired: this.params.renderer.wired,
      envMap: this.skybox,
      foamIntensity: this.params.renderer.foamIntensity,
      breakingIntensity: this.params.renderer.breakingIntensity,
      breakingOffset: this.params.renderer.breakingOffset
    });
  }

  private getStat(renderer: OceanRenderer): string {
    return `AABB tests: ${renderer.stat.tests}/ Visible: ${renderer.stat.tiles}`;
  }

  private onReset() {
    cpy(this.params, defaults);
    this.resetOcean();
    this.onRendererSettingsChange();
    this.pane.refresh();
  }

  private resetOcean() {
    this.ocean.dispose();
    this.spectrum.dispose();
    this.createSpectrum();
    this.createOcean();
  }
}

function hex2rgb(hex: string): vec3 {
  const values = hex.match(/\w\w/g).map((x) => +`0x${x}` / 255) as [
    number,
    number,
    number
  ];
  return vec3.fromValues(...values);
}

function rgb2hex(rgb: vec3): string {
  return (
    `#` +
    Array.from(rgb)
      .map((x: number) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function cpy<T>(dest: T, src: T) {
  for (const key in src) {
    if (typeof src[key] == 'object' || Array.isArray(src[key])) {
      cpy(dest[key] ?? (dest[key] = {}), src[key]);
    } else {
      dest[key] = src[key];
    }
  }

  return dest;
}
