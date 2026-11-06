const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
    navigation.classList.toggle("is-open", !isExpanded);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
      navigation.classList.remove("is-open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
      navigation.classList.remove("is-open");
      menuToggle.focus();
    }
  });
}

const themeToggles = [...document.querySelectorAll("[data-theme-toggle]")];
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

const applyTheme = (theme, persist = false) => {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  const nextAction = nextTheme === "dark" ? "light" : "dark";

  themeToggles.forEach((toggle) => {
    const label = `Switch to ${nextAction} mode`;
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    const screenReaderLabel = toggle.querySelector(".sr-only");
    if (screenReaderLabel) screenReaderLabel.textContent = label;
  });

  themeColorMeta?.setAttribute("content", nextTheme === "dark" ? "#111815" : "#FAF9F6");
  if (persist) {
    try {
      localStorage.setItem("gwt-theme", nextTheme);
    } catch {
      // The selected theme still applies for this page view when storage is unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent("gwt:themechange", { detail: { theme: nextTheme } }));
};

applyTheme(document.documentElement.dataset.theme);
themeToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
  });
});

window.addEventListener("storage", (event) => {
  if (event.key === "gwt-theme" && event.newValue) applyTheme(event.newValue);
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroSection = document.querySelector(".hero");
const heroGlobe = document.querySelector("#hero-globe-background");

if (heroSection && heroGlobe) {
  let heroProgressFrame = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const updateHeroGlobe = () => {
    heroProgressFrame = 0;
    const travel = Math.max(heroSection.offsetHeight, 1);
    const rawProgress = reducedMotion
      ? 0
      : clamp(-heroSection.getBoundingClientRect().top / travel, 0, 1);
    const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
    heroGlobe.style.setProperty("--globe-scroll-progress", String(progress));
    heroGlobe.style.setProperty("--globe-opacity", String(0.76 * (1 - progress * 0.72)));
    heroGlobe.style.setProperty("--globe-scale", String(1 - progress * 0.78));
    window.dispatchEvent(new CustomEvent("gwt:hero-progress", { detail: { progress } }));
  };
  const scheduleHeroGlobeUpdate = () => {
    if (heroProgressFrame) return;
    heroProgressFrame = window.requestAnimationFrame(updateHeroGlobe);
  };

  window.addEventListener("scroll", scheduleHeroGlobeUpdate, { passive: true });
  window.addEventListener("resize", scheduleHeroGlobeUpdate, { passive: true });
  scheduleHeroGlobeUpdate();
}

const constructionSequence = document.querySelector("#construction-sequence");
const constructionCanvas = document.querySelector("#construction-canvas");
const constructionProgress = constructionSequence?.querySelector(".construction-progress");
const constructionProgressFill = constructionProgress?.querySelector("span");
const constructionFrameNumber = document.querySelector("#construction-frame-number");
const constructionStageLabel = document.querySelector("#construction-stage-label");
const formationSection = constructionSequence?.closest(".assembly-story");
const formationProgress = document.querySelector(".assembly-progress");
const formationProgressFill = formationProgress?.querySelector("span");
const formationSteps = [...document.querySelectorAll(".assembly-step")];
const formationVisual = document.querySelector(".assembly-visual");

if (constructionSequence && constructionCanvas && formationSection) {
  const context = constructionCanvas.getContext("2d", { alpha: false });
  const frameCount = 40;
  const frameCache = new Map();
  let requestedFrame = 1;
  let previousFrame = 1;
  let scrollFrame = 0;
  let activeStage = -1;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const framePath = (frame) => `assets/construction-frames/frame_${String(frame).padStart(3, "0")}.jpg`;

  const drawFrame = (frame, image) => {
    if (!context || frame !== requestedFrame || !image.naturalWidth) return;
    context.drawImage(image, 0, 0, constructionCanvas.width, constructionCanvas.height);
    constructionSequence.classList.add("is-ready");
  };

  const trimFrameCache = () => {
    while (frameCache.size > 7) {
      const removable = [...frameCache.keys()].find((frame) => frame !== requestedFrame && Math.abs(frame - requestedFrame) > 2);
      if (!removable) break;
      frameCache.delete(removable);
    }
  };

  const loadFrame = (frame) => {
    if (frame < 1 || frame > frameCount) return null;
    const cached = frameCache.get(frame);
    if (cached) {
      frameCache.delete(frame);
      frameCache.set(frame, cached);
      return cached;
    }

    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => drawFrame(frame, image), { once: true });
    image.src = framePath(frame);
    frameCache.set(frame, image);
    trimFrameCache();
    return image;
  };

  const requestConstructionFrame = (frame, progress) => {
    previousFrame = requestedFrame;
    requestedFrame = frame;
    const image = loadFrame(frame);
    if (image?.complete && image.naturalWidth) drawFrame(frame, image);

    const direction = Math.sign(frame - previousFrame) || 1;
    loadFrame(frame + direction);
    loadFrame(frame + direction * 2);

    if (constructionFrameNumber) constructionFrameNumber.textContent = String(frame).padStart(3, "0");
    if (constructionProgressFill) constructionProgressFill.style.width = `${Math.round(progress * 100)}%`;
    if (constructionProgress) {
      const value = Math.round(progress * 100);
      constructionProgress.setAttribute("aria-valuenow", String(value));
    }
    if (formationProgressFill) formationProgressFill.style.width = `${Math.round(progress * 100)}%`;
    if (formationProgress) formationProgress.setAttribute("aria-valuenow", String(Math.round(progress * 100)));

    const stageIndex = frame <= 12 ? 0 : frame <= 28 ? 1 : 2;
    const stageNames = ["01 / FOUNDATION", "02 / STRUCTURE", "03 / EXPERIENCE"];
    const stage = stageNames[stageIndex];
    if (stageIndex !== activeStage) {
      activeStage = stageIndex;
      if (constructionStageLabel) constructionStageLabel.textContent = stage;
      if (formationVisual) formationVisual.dataset.stage = String(stageIndex);
      formationSteps.forEach((button, index) => {
        const isActive = index === stageIndex;
        button.classList.toggle("is-active", isActive);
        if (isActive) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    }
  };

  const updateConstructionSequence = () => {
    const travel = Math.max(formationSection.offsetHeight - window.innerHeight, 1);
    const progress = reducedMotion
      ? 1
      : clamp(-formationSection.getBoundingClientRect().top / travel, 0, 1);
    const frame = reducedMotion ? frameCount : 1 + Math.round(progress * (frameCount - 1));
    requestConstructionFrame(frame, progress);
  };

  if (reducedMotion) {
    updateConstructionSequence();
  } else {
    const scheduleConstructionUpdate = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        updateConstructionSequence();
      });
    };

    window.addEventListener("scroll", scheduleConstructionUpdate, { passive: true });
    window.addEventListener("resize", scheduleConstructionUpdate, { passive: true });
    updateConstructionSequence();
  }
}

const assemblyStory = document.querySelector(".assembly-story");

if (assemblyStory) {
  const steps = [...assemblyStory.querySelectorAll(".assembly-step")];
  steps.forEach((button) => {
    button.addEventListener("click", () => {
      if (reducedMotion) return;
      const progress = Number(button.dataset.scrollProgress ?? 0);
      const sectionTop = assemblyStory.getBoundingClientRect().top + window.scrollY;
      const scrollRange = Math.max(assemblyStory.offsetHeight - window.innerHeight, 0);
      window.scrollTo({ top: sectionTop + scrollRange * progress, behavior: "smooth" });
    });
  });
}
const customCursor = document.querySelector(".cursor-orbit");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (customCursor && finePointer && !reducedMotion) {
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let animationFrame = 0;
  let hasPointer = false;

  const followPointer = () => {
    pointerX += (targetX - pointerX) * 0.18;
    pointerY += (targetY - pointerY) * 0.18;
    customCursor.style.setProperty("--cursor-x", `${pointerX}px`);
    customCursor.style.setProperty("--cursor-y", `${pointerY}px`);

    if (Math.abs(targetX - pointerX) + Math.abs(targetY - pointerY) > 0.15) {
      animationFrame = window.requestAnimationFrame(followPointer);
    } else {
      animationFrame = 0;
    }
  };

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;

    targetX = event.clientX;
    targetY = event.clientY;
    const interactive = event.target instanceof Element && event.target.closest("a, button, [data-cursor='interactive']");
    customCursor.classList.toggle("is-hovering", Boolean(interactive));

    if (!hasPointer) {
      pointerX = targetX;
      pointerY = targetY;
      customCursor.style.setProperty("--cursor-x", `${pointerX}px`);
      customCursor.style.setProperty("--cursor-y", `${pointerY}px`);
      document.body.classList.add("has-custom-pointer");
      hasPointer = true;
    } else if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(followPointer);
    }
  }, { passive: true });

  window.addEventListener("pointerdown", () => customCursor.classList.add("is-pressed"));
  window.addEventListener("pointerup", () => customCursor.classList.remove("is-pressed"));
  window.addEventListener("pointerleave", () => {
    document.body.classList.remove("has-custom-pointer");
    customCursor.classList.remove("is-hovering", "is-pressed");
    hasPointer = false;
  });

  document.querySelectorAll("[data-cursor='interactive']").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });
}

const revealItems = document.querySelectorAll(".reveal, .process-line");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -30px 0px" },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const experienceMap = document.querySelector("#experience-map");
if (experienceMap) {
  let mapScale = 1;
  document.querySelectorAll(".map-controls [data-map-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      mapScale = Math.max(0.88, Math.min(1.34, mapScale + (button.dataset.mapZoom === "in" ? 0.12 : -0.12)));
      experienceMap.style.setProperty("--map-scale", String(mapScale));
    });
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();
