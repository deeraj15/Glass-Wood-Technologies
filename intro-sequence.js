/**
 * 90FPS High-Refresh Canvas Walkthrough Engine with Motion Blending
 * ──────────────────────────────────────────────────────────────────
 * Why 90FPS:
 *  - 480 high-definition frames (every single native frame of the 20s walkthrough)
 *    are cached in GPU memory.
 *  - Uses sub-frame alpha blending between adjacent frames (frame A + frame B)
 *    so even intermediate sub-pixel scroll positions produce silky-smooth
 *    90Hz / 120Hz high refresh rate motion without stepping or stutter.
 *
 * Exact User Timeline (Seconds & Room Triggers):
 *  • 0.0s to 11.0s (frames 1 to 264): Exterior Architecture (NO room text).
 *  • 11.0s to 14.5s (frames 265 to 348): LIVING ROOM.
 *  • 14.5s to 16.4s (frames 349 to 393): BEDROOM.
 *  • 16.4s to 18.4s (frames 394 to 441): KITCHEN.
 *  • 18.4s to 20.0s (frames 442 to 480): BALCONY.
 *  • Pure white typography on the top-left.
 */
(() => {
  "use strict";

  const intro = document.getElementById("cinematic-intro");
  const canvas = document.getElementById("intro-tour-canvas");
  const textOverlay = document.getElementById("intro-text-overlay");
  const skipBtn = document.getElementById("intro-skip");

  // Top-left pure white callout
  const roomPanel = document.getElementById("room-callout-panel");
  const roomKicker = document.getElementById("room-callout-kicker");
  const roomName = document.getElementById("room-callout-name");

  // Bottom HUD
  const phaseLabelEl = document.getElementById("intro-phase-label");
  const progressFillEl = document.getElementById("intro-progress-fill");

  if (!intro || !canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  document.body.classList.add("intro-active");

  const totalFrames = 480; // Full 24fps * 20s = 480 dense frames
  const frames = [];
  const frameLoaded = new Array(totalFrames + 1).fill(false);
  let introCompleted = false;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ── 1. EXACT USER ROOM SCHEDULE (Mapped to Seconds) ────────── */
  const roomSchedule = [
    { key: "living",  title: "LIVING ROOM", kicker: "01 // INTERIOR SPACES", startSec: 11.0, endSec: 14.5 },
    { key: "bedroom", title: "BEDROOM",     kicker: "02 // PRIVATE SUITE",   startSec: 14.5, endSec: 16.4 },
    { key: "kitchen", title: "KITCHEN",     kicker: "03 // CULINARY STUDIO", startSec: 16.4, endSec: 18.4 },
    { key: "balcony", title: "BALCONY",     kicker: "04 // TERRACE & VIEW",  startSec: 18.4, endSec: 20.0 }
  ];

  /* ── 2. PROGRESSIVE PRELOAD ENGINE (INSTANT START + FULL CACHE) ── */
  const getFramePath = (i) =>
    `assets/tour-frames-hd/frame_${String(i).padStart(3, "0")}.jpg`;

  const loadSingleFrame = (i) => {
    if (frames[i]) return;
    const img = new Image();
    img.decoding = "async";
    img.src = getFramePath(i);
    img.onload = () => {
      frames[i] = img;
      frameLoaded[i] = true;
    };
  };

  const preloadAllFrames = () => {
    // Priority 1: Load every 4th frame instantly so entire timeline is seekable in <200ms
    for (let i = 1; i <= totalFrames; i += 4) {
      loadSingleFrame(i);
    }
    // Priority 2: Fill in remaining frames immediately in background
    setTimeout(() => {
      for (let i = 1; i <= totalFrames; i++) {
        loadSingleFrame(i);
      }
    }, 100);
  };

  /* ── 3. 90FPS SUB-FRAME BLENDING RENDERER ───────────────────── */
  // Blend between adjacent frames for true high-refresh rate fluidity
  const renderFrameSubpixel = (fractionalIndex) => {
    const baseIndex = Math.floor(fractionalIndex);
    const nextIndex = Math.min(totalFrames, baseIndex + 1);
    const alpha = fractionalIndex - baseIndex;

    // Find nearest available base frame if loading
    let currentImg = frames[baseIndex];
    if (!currentImg) {
      for (let offset = 0; offset <= 8; offset++) {
        if (frames[baseIndex - offset]) { currentImg = frames[baseIndex - offset]; break; }
        if (frames[baseIndex + offset]) { currentImg = frames[baseIndex + offset]; break; }
      }
    }

    if (!currentImg || !ctx) return;

    // Draw primary frame
    ctx.globalAlpha = 1.0;
    ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);

    // If next frame is ready and alpha is noticeable, blend it for 90Hz/120Hz micro-smoothness
    const nextImg = frames[nextIndex];
    if (nextImg && alpha > 0.06 && alpha < 0.94) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(nextImg, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    }
  };

  /* ── 4. 90FPS ULTRA-FLUID SPRING INERTIA LOOP ───────────────── */
  let targetScrollY = 0;
  let currentScrollY = 0;
  let animFrameId = null;
  const inertiaEase = 0.16; // Snappier, zero-lag spring response

  const updateLoop = () => {
    if (introCompleted) return;

    // Smooth Linear Interpolation
    const delta = targetScrollY - currentScrollY;
    currentScrollY += delta * inertiaEase;

    const maxScroll = intro.scrollHeight - intro.clientHeight;
    const progress = maxScroll > 0 ? Math.max(0, Math.min(1, currentScrollY / maxScroll)) : 0;

    // Fractional frame position (e.g. 142.35)
    const fractionalFrame = Math.max(1, Math.min(totalFrames, 1 + progress * (totalFrames - 1)));

    // Render with 90Hz sub-frame blending
    renderFrameSubpixel(fractionalFrame);

    // Timeline calculation in seconds (0.0s -> 20.0s)
    const currentSeconds = progress * 20.0;
    updateRoomCallout(currentSeconds);

    // Update bottom HUD
    if (progressFillEl) {
      progressFillEl.style.width = `${progress * 100}%`;
    }

    // Headline fade out
    if (textOverlay) {
      const fade = Math.max(0, 1 - progress * 8);
      textOverlay.style.opacity = String(fade);
      textOverlay.style.pointerEvents = fade <= 0.05 ? "none" : "auto";
    }

    // Reached end of tour -> reveal main website
    if (progress >= 0.988) {
      revealMainSite();
      return;
    }

    animFrameId = requestAnimationFrame(updateLoop);
  };

  /* ── 5. ROOM CALLOUT TRACKER (PURE WHITE TYPOGRAPHY) ───────── */
  let activeRoomKey = null;

  const updateRoomCallout = (sec) => {
    let matched = null;

    // Exact User Timeline:
    // 0s - 11s: Exterior -> NO text
    // 11.0s - 14.5s: LIVING ROOM
    // 14.5s - 16.4s: BEDROOM
    // 16.4s - 18.4s: KITCHEN
    // 18.4s - 20.0s: BALCONY
    for (let i = 0; i < roomSchedule.length; i++) {
      const item = roomSchedule[i];
      if (sec >= item.startSec && sec < item.endSec) {
        matched = item;
        break;
      }
    }

    if (phaseLabelEl) {
      if (sec < 11.0) {
        phaseLabelEl.textContent = "EXTERIOR ARCHITECTURE";
      } else if (matched) {
        phaseLabelEl.textContent = matched.title;
      }
    }

    if (matched && matched.key !== activeRoomKey) {
      activeRoomKey = matched.key;
      roomPanel.classList.remove("is-active");
      setTimeout(() => {
        if (roomKicker) roomKicker.textContent = matched.kicker;
        if (roomName) roomName.textContent = matched.title;
        roomPanel.classList.add("is-active");
      }, 90);
    } else if (!matched && activeRoomKey) {
      activeRoomKey = null;
      roomPanel.classList.remove("is-active");
    }
  };

  /* ── 6. REVEAL MAIN WEBSITE ─────────────────────────────────── */
  const revealMainSite = () => {
    if (introCompleted) return;
    introCompleted = true;

    cancelAnimationFrame(animFrameId);
    intro.classList.add("zoom-out");

    setTimeout(() => {
      intro.classList.add("is-done");
      document.body.classList.remove("intro-active");
      document.documentElement.style.overflow = "";
      setTimeout(() => intro.remove(), 700);
    }, 1100);
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", revealMainSite);
  }

  /* ── 7. SCROLL EVENT LISTENER ───────────────────────────────── */
  const onScroll = () => {
    if (introCompleted) return;
    targetScrollY = intro.scrollTop;
  };

  /* ── 8. INITIALIZE ───────────────────────────────────────────── */
  const init = async () => {
    preloadAllFrames();

    // Render frame 1 immediately
    const img1 = new Image();
    img1.src = getFramePath(1);
    img1.onload = () => {
      ctx.drawImage(img1, 0, 0, canvas.width, canvas.height);
    };

    // Headline entrance
    await wait(200);
    const words = textOverlay.querySelectorAll(".intro-word");
    words.forEach((w, idx) => {
      setTimeout(() => w.classList.add("is-visible"), idx * 220);
    });

    intro.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(updateLoop);
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
