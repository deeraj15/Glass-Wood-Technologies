import * as THREE from "three";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroBackground = document.querySelector("#hero-globe-background");
let heroGlobeEffect = null;
let heroScrollProgress = Number(heroBackground?.style.getPropertyValue("--globe-scroll-progress")) || 0;

const applyHeroGlobeProgress = (progress) => {
  heroScrollProgress = THREE.MathUtils.clamp(progress, 0, 1);
  if (!heroGlobeEffect?.cont2) return;
  heroGlobeEffect.cont2.scale.setScalar(1 - heroScrollProgress * 0.78);
  const opacity = 1 - heroScrollProgress * 0.82;
  [heroGlobeEffect.sphere, heroGlobeEffect.linesMesh2, heroGlobeEffect.linesMesh3].forEach((element) => {
    if (!element?.material) return;
    element.material.transparent = true;
    element.material.opacity = opacity;
  });
};

window.addEventListener("gwt:hero-progress", (event) => {
  applyHeroGlobeProgress(event.detail?.progress ?? 0);
});

if (heroBackground && reduceMotion) {
  heroBackground.classList.add("is-static");
} else if (heroBackground) {
  window.THREE = THREE;

  const themeOptions = () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    return {
      color: isDark ? 0x76e1d4 : 0x317f7a,
      color2: isDark ? 0xd6c17f : 0x9aa96b,
      backgroundColor: isDark ? 0x111815 : 0xfaf9f6,
      backgroundAlpha: 0,
    };
  };

  const vantaScript = document.createElement("script");
  vantaScript.src = "assets/vanta.globe.min.js";
  vantaScript.async = true;
  vantaScript.addEventListener("load", () => {
    try {
      if (!window.VANTA?.GLOBE) throw new Error("Vanta GLOBE failed to register.");
      heroGlobeEffect = window.VANTA.GLOBE({
        el: heroBackground,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 0.84,
        points: 10,
        maxDistance: 20,
        spacing: 15,
        showDots: true,
        speed: 0.6,
        ...themeOptions(),
      });
      if (!heroGlobeEffect?.renderer || !heroGlobeEffect.scene || !heroGlobeEffect.camera) {
        heroBackground.classList.add("is-static");
        heroGlobeEffect = null;
        return;
      }
      applyHeroGlobeProgress(heroScrollProgress);
      window.addEventListener("gwt:themechange", () => heroGlobeEffect?.setOptions(themeOptions()));
    } catch {
      heroGlobeEffect = null;
      heroBackground.classList.add("is-static");
    }
  }, { once: true });
  vantaScript.addEventListener("error", () => heroBackground.classList.add("is-static"), { once: true });
  document.head.append(vantaScript);
}
