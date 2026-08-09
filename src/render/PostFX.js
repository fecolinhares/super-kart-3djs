/**
 * Super Kart 3D.js — post-processing chain.
 * RenderPass → BloomPass → Vignette → OutputPass. All knobs from
 * CONFIG.render. Falls back to plain renderer.render if the composer fails
 * to initialize (e.g. very old GPU).
 *
 * HISTORY: the custom ColorGradeShader (saturation/contrast) was REMOVED —
 * chained as bloom→colorgrade→vignette it rendered black on software GL
 * (three chained HalfFloat passes). ACES tone mapping in OutputPass carries
 * the grade; CONFIG.render.colorGrade* values are intentionally unused now.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
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
      // NOTE: a custom HalfFloat + samples:4 target made SwiftShader render
      // black once the scene moved to PBR (MeshStandardMaterial everywhere) —
      // the stock EffectComposer target (also HalfFloat, no MSAA) is the
      // stable path; antialias comes from the renderer's default framebuffer
      // on the final OutputPass composite.
      this.composer = new EffectComposer(renderer);
      this.composer.addPass(new RenderPass(scene, camera));

      // BLOOM — the classic BloomPass (threshold + 2-pass blur), NOT
      // UnrealBloomPass (bisection: Unreal renders BLACK on software GL with
      // the PBR scene). Even BloomPass fails on software GL — so detect the
      // software rasterizer and drop bloom there (hardware GPUs keep it).
      const gl = renderer.getContext();
      let softGL = false;
      try {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const rn = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        softGL = /swiftshader|llvmpipe|softpipe|software/i.test(rn);
      } catch { /* no ext */ }
      this.bloom = softGL
        ? null
        : new BloomPass(
            CONFIG.render.bloomStrength * 0.6,
            1.0,
            CONFIG.render.bloomThreshold,
            512
          );
      if (this.bloom) this.composer.addPass(this.bloom);

      // Vignette — NOTE: the custom ColorGradeShader (saturation/contrast)
      // was removed: chained as bloom→colorgrade→vignette it rendered BLACK
      // on software GL (3 chained HalfFloat passes). The OutputPass already
      // applies ACES tone mapping + sRGB; exposure carries the punch.
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
    // BloomPass has no dynamic strength setter; this is a soft no-op kept
    // for API compatibility (bloom is disabled on software GL anyway).
    if (this.bloom && this.bloom.convolution) {
      this.bloom.convolution.material.uniforms.amount.value = strength;
    }
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
