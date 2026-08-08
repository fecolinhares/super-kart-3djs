/**
 * Super Kart 3D.js — post-processing chain.
 * RenderPass → UnrealBloomPass → ColorGrade (saturation/contrast) → Vignette
 * → OutputPass. All knobs from CONFIG.render. Falls back to plain
 * renderer.render if the composer fails to initialize (e.g. very old GPU).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { CONFIG } from '../config.js';

const ColorGradeShader = {
  name: 'ColorGradeShader',
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: CONFIG.render.colorGradeSaturation },
    contrast: { value: CONFIG.render.colorGradeContrast },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 sat = mix(vec3(l), c.rgb, saturation);
      vec3 con = (sat - 0.5) * contrast + 0.5;
      gl_FragColor = vec4(con, c.a);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = false;
    this.composer = null;

    try {
      this.composer = new EffectComposer(renderer);
      this.composer.addPass(new RenderPass(scene, camera));

      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.render.bloomStrength,
        CONFIG.render.bloomRadius,
        CONFIG.render.bloomThreshold
      );
      this.composer.addPass(this.bloom);

      this.colorGrade = new ShaderPass(ColorGradeShader);
      this.composer.addPass(this.colorGrade);

      this.vignette = new ShaderPass(VignetteShader);
      this.vignette.uniforms.offset.value = 1 - CONFIG.render.vignetteStrength * 0.6;
      this.vignette.uniforms.darkness.value = CONFIG.render.vignetteStrength;
      this.composer.addPass(this.vignette);

      this.composer.addPass(new OutputPass());
      this.enabled = true;
    } catch (err) {
      console.warn('[PostFX] composer unavailable, using plain render.', err);
      this.enabled = false;
    }

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _onResize() {
    if (!this.composer) return;
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  setBloom(strength) {
    if (this.bloom) this.bloom.strength = strength;
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    if (this.composer) this.composer.dispose();
  }
}
