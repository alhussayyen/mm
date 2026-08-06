/**
 * محمد الحصين — Personal Brand Site
 * Motion layer: scroll reveals, header state, mobile nav, counters.
 * Vanilla JS, no dependencies. Respects prefers-reduced-motion.
 */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById('siteHeader');
  const setHeaderState = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuToggle && mobileMenu) {
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      expanded ? closeMenu() : openMenu();
    });
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- Scroll cue ---------- */
  const scrollCue = document.getElementById('scrollCue');
  if (scrollCue) {
    scrollCue.addEventListener('click', () => {
      const next = document.querySelector('.statement');
      if (next) next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  const revealTargets = document.querySelectorAll('.reveal-up, .reveal-scale, .reveal-lines');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    // No IO support or reduced motion: show everything immediately.
    revealTargets.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Animated stat counters ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (Number.isNaN(target) || reduceMotion) {
      el.textContent = el.dataset.count;
      return;
    }
    // Skip animation for 4-digit "since" years — show as-is.
    if (target > 100) {
      el.textContent = el.dataset.count;
      return;
    }
    let current = 0;
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      current = Math.floor(progress * target);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => countIO.observe(el));
  }

  /* ---------- Subtle parallax on hero media (rAF-throttled) ---------- */
  const heroMedia = document.querySelector('.hero__media');
  if (heroMedia && !reduceMotion) {
    let ticking = false;
    const updateParallax = () => {
      const y = window.scrollY;
      const hero = document.querySelector('.hero');
      const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
      if (y < heroHeight) {
        heroMedia.style.transform = `translateY(${y * 0.18}px) scale(1.06)`;
      }
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
    updateParallax();
  }
})();

/**
 * ---------- Press section: infinite carousel ----------
 * Dependency-free (no Embla/Swiper download) so it can't add load weight —
 * the moving parts are the same as those libraries use internally: a flex
 * track moved with `transform: translateX()`, a small clone buffer at each
 * end for the illusion of an infinite loop, and Pointer Events for drag.
 * Runs BEFORE the X-embed lazy-loader below so the cloned slides it creates
 * are already in the DOM when that script scans for `.press-card__embed`.
 */
(() => {
  'use strict';

  const root = document.getElementById('pressCarousel');
  const track = document.getElementById('pressTrack');
  if (!root || !track) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prevBtn = root.querySelector('[data-carousel-prev]');
  const nextBtn = root.querySelector('[data-carousel-next]');

  const originalSlides = Array.from(track.children);
  const total = originalSlides.length;

  if (total > 1) {
    const BUFFER = Math.min(4, total); // covers the largest visible count (desktop = 4)

    const makeClone = (slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a, button, [tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
      return clone;
    };

    const leadingClones = originalSlides.slice(total - BUFFER).map(makeClone);
    const trailingClones = originalSlides.slice(0, BUFFER).map(makeClone);

    // Re-append everything in loop order: [leading clones][real slides][trailing clones].
    // appendChild() on a node already in the DOM moves it, so this reorders in one pass.
    const frag = document.createDocumentFragment();
    leadingClones.forEach((el) => frag.appendChild(el));
    originalSlides.forEach((el) => frag.appendChild(el));
    trailingClones.forEach((el) => frag.appendChild(el));
    track.appendChild(frag);

    const slides = Array.from(track.children);
    let currentIndex = BUFFER; // first real slide
    let slideStep = 0;
    let animating = false;

    const measure = () => {
      const sample = slides[BUFFER];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      slideStep = sample.getBoundingClientRect().width + gap;
    };

    const place = (index, animate) => {
      currentIndex = index;
      const x = -currentIndex * slideStep;
      if (!animate) {
        track.style.transition = 'none';
        track.style.transform = `translateX(${x}px)`;
        void track.offsetHeight; // force reflow before restoring the transition
        track.style.transition = '';
      } else {
        track.style.transform = `translateX(${x}px)`;
      }
    };

    const normalizeAfterTransition = () => {
      if (currentIndex >= BUFFER + total) {
        place(currentIndex - total, false);
      } else if (currentIndex < BUFFER) {
        place(currentIndex + total, false);
      }
    };

    track.addEventListener('transitionend', (e) => {
      if (e.target !== track || e.propertyName !== 'transform') return;
      animating = false;
      normalizeAfterTransition();
    });

    const goNext = () => {
      if (animating) return;
      animating = !reduceMotion;
      place(currentIndex + 1, !reduceMotion);
      if (reduceMotion) normalizeAfterTransition();
    };
    const goPrev = () => {
      if (animating) return;
      animating = !reduceMotion;
      place(currentIndex - 1, !reduceMotion);
      if (reduceMotion) normalizeAfterTransition();
    };

    if (nextBtn) nextBtn.addEventListener('click', goNext);
    if (prevBtn) prevBtn.addEventListener('click', goPrev);

    // Initial position — synchronous, before the browser's first paint of
    // this section, so the clone buffer is never visible even for a frame.
    measure();
    place(currentIndex, false);

    let resizeTimer;
    window.addEventListener(
      'resize',
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          measure();
          place(currentIndex, false);
        }, 120);
      },
      { passive: true }
    );

    /* ---- Drag (mouse + touch, via Pointer Events) ---- */
    let dragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartTranslate = 0;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartTranslate = -currentIndex * slideStep;
      track.style.transition = 'none';
      track.classList.add('is-dragging');
      root.classList.add('is-dragging');
      try {
        track.setPointerCapture(e.pointerId);
      } catch (err) {
        /* noop — pointer capture is a progressive enhancement here */
      }
    });

    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - dragStartX;
      if (Math.abs(delta) > 4) dragMoved = true;
      track.style.transform = `translateX(${dragStartTranslate + delta}px)`;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      root.classList.remove('is-dragging');
      track.style.transition = '';
      const endX = typeof e.clientX === 'number' ? e.clientX : dragStartX;
      const delta = endX - dragStartX;
      const threshold = Math.max(40, slideStep * 0.15);
      if (Math.abs(delta) > threshold) {
        if (delta < 0) goNext();
        else goPrev();
      } else {
        place(currentIndex, true);
      }
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // Swallow the click that follows a real drag so links/embeds inside the
    // dragged card don't get accidentally activated.
    track.addEventListener(
      'click',
      (e) => {
        if (dragMoved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }
})();

/**
 * ---------- X (Twitter) official embeds — press section ----------
 * Lazy-loaded: platform.twitter.com/widgets.js is only fetched the moment a
 * card is about to enter the viewport, so it never affects initial page
 * speed. Each card starts as a skeleton, becomes the real embed on success,
 * or a branded fallback (X mark + link) if the embed can't load — for
 * example when a blocker prevents X's script/iframes from loading.
 */
(() => {
  'use strict';

  const embeds = document.querySelectorAll('.press-card__embed');
  if (!embeds.length) return;

  let scriptPromise = null;
  const loadTwitterScript = () => {
    if (window.twttr && window.twttr.widgets) return Promise.resolve(window.twttr);
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://platform.twitter.com/widgets.js';
      s.async = true;
      s.onload = () => (window.twttr ? resolve(window.twttr) : reject(new Error('twttr unavailable')));
      s.onerror = () => reject(new Error('script failed to load'));
      document.body.appendChild(s);
    });
    return scriptPromise;
  };

  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

  const showFallback = (container) => {
    const skeleton = container.querySelector('.press-card__skeleton');
    const fallback = container.querySelector('.press-card__fallback');
    if (skeleton) skeleton.remove();
    if (fallback) fallback.style.display = 'flex';
  };

  const mountTweet = (container) => {
    const id = container.dataset.tweetId;
    if (!id) return;
    withTimeout(loadTwitterScript(), 9000)
      .then((twttr) =>
        withTimeout(
          twttr.widgets.createTweet(id, container, {
            theme: 'light',
            dnt: true,
            conversation: 'none',
            align: 'center',
          }),
          9000
        )
      )
      .then((el) => {
        const skeleton = container.querySelector('.press-card__skeleton');
        if (el) {
          if (skeleton) skeleton.remove();
        } else {
          showFallback(container);
        }
      })
      .catch(() => showFallback(container));
  };

  // Kick the widgets.js fetch off immediately on page load rather than
  // waiting for the press section to scroll into view — by the time the
  // visitor reaches it (several sections down), the script is already
  // warm and each createTweet() call resolves with no visible delay.
  loadTwitterScript().catch(() => {});

  // Mount every embed right away too (not gated behind IntersectionObserver)
  // so all the tweet fetches start in parallel as soon as the page is
  // idle, instead of serially as each card scrolls into view.
  const mountAll = () => embeds.forEach(mountTweet);
  if ('requestIdleCallback' in window) {
    requestIdleCallback(mountAll, { timeout: 1500 });
  } else {
    setTimeout(mountAll, 150);
  }
})();

/**
 * ---------- Capabilities section: right-anchored peek carousel + lightbox ----------
 * Rebuilt from scratch around a single source of truth per carousel: one
 * "current index" integer. Every other piece of state — the track's
 * transform, the arrows' enabled/disabled state, and the drag bounds — is
 * *derived* from that index, nothing else is tracked separately. Arrows,
 * drag (mouse, touch and trackpad all arrive as Pointer Events, so one
 * code path covers all three) and the lightbox's own arrows/drag all call
 * the exact same next()/prev()/goTo() functions on the exact same index.
 * A completed drag can only ever move the index by exactly one step —
 * never more, never a "closest position" guess — and the index is always
 * clamped so the track can never scroll past its real content (no
 * trailing empty space, no runaway scrolling past the last photo).
 * Same behaviour on every breakpoint (no separate mobile/desktop code
 * paths — CSS alone switches 1.5 visible "slots" on mobile to 3.5 on
 * desktop, see css/style.css) and on touch, mouse or trackpad.
 * Section colours/type/card design/image ratios/peek effect/nav position
 * are untouched — only the browsing mechanics changed. No third-party
 * carousel library is used.
 */
(() => {
  'use strict';

  const carouselEl = document.getElementById('capCarousel');
  const viewportEl = document.getElementById('capViewport');
  const trackEl = document.getElementById('capTrack');
  const prevBtn = document.getElementById('capPrev');
  const nextBtn = document.getElementById('capNext');
  const lightbox = document.getElementById('capLightbox');
  const lightboxViewport = document.getElementById('capLightboxViewport');
  const lightboxTrack = document.getElementById('capLightboxTrack');
  const lightboxClose = document.getElementById('capLightboxClose');
  if (!carouselEl || !viewportEl || !trackEl || !lightbox || !lightboxTrack) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slides = Array.from(trackEl.children);
  const lightboxSlides = Array.from(lightboxTrack.children);
  const total = slides.length;
  if (!total) return;

  // Pull the real image URLs straight from the main carousel — the
  // lightbox never keeps its own separate, hardcoded copy of the list.
  const sources = slides.map((slide) => {
    const img = slide.querySelector('img');
    return img ? img.getAttribute('src') : '';
  });

  /* ============================================================
     One tiny factory, two instances (the gallery track and the
     lightbox track). Both are "index carousels": a track whose
     resting transform is always `direction * index * step`, where
     `direction` is +1 for a right-anchored, row-reversed track
     (the main gallery — slide 0 sits flush at the right, see CSS)
     or -1 for a plain left-to-right track (the lightbox). `step`
     is one slide's real rendered width, measured from the DOM.
     `maxIndex` is derived from how many slides actually fit in the
     viewport at once, so the last resting position never leaves
     empty space and never scrolls past the final photo.
     ============================================================ */
  function createIndexCarousel({ track, viewport, itemCount, direction }) {
    let index = 0;
    let step = 0;
    let maxIndex = 0;

    const clampIndex = (i) => Math.max(0, Math.min(maxIndex, i));

    function measure() {
      const first = track.children[0];
      if (!first) return;
      const rect = first.getBoundingClientRect();
      if (!rect.width) return; // track is hidden (lightbox not open yet) — nothing to measure
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = rect.width + gap;
      const visibleSlots = viewport.clientWidth / step;
      // How many one-slide steps fit before the viewport would start
      // showing past the last slide. Flooring against the *measured*
      // visible slot count — not itemCount - 1 — is what stops the
      // track flush with its real content instead of overshooting
      // into empty space.
      maxIndex = Math.max(0, Math.floor(itemCount - visibleSlots + 1e-6));
      index = clampIndex(index);
    }

    function positionX(i) {
      return direction * i * step;
    }

    function render(animate) {
      const x = positionX(index);
      if (!animate) track.style.transition = 'none';
      track.style.transform = `translate3d(${x}px,0,0)`;
      if (!animate) {
        void track.offsetHeight; // reflow so the transition re-enables cleanly next time
        track.style.transition = '';
      }
    }

    const changeListeners = [];
    function goTo(i, animate) {
      index = clampIndex(i);
      render(animate !== false && !reduceMotion);
      changeListeners.forEach((fn) => fn(index, maxIndex));
    }

    return {
      measure,
      render,
      goTo,
      next: () => goTo(index + 1),
      prev: () => goTo(index - 1),
      positionX,
      direction,
      getIndex: () => index,
      getMaxIndex: () => maxIndex,
      getStep: () => step,
      onChange: (fn) => changeListeners.push(fn),
    };
  }

  /* ---------- Shared drag handling ----------
     Real-time 1:1 tracking while the pointer is down (the photo follows
     the finger/cursor directly, in the track's own coordinate system —
     translate3d(x) always moves the track toward +x for positive x,
     whatever `direction` means for this particular track). On release,
     a drag only ever resolves to exactly one of: go to the next index,
     go to the previous index, or snap back to the current one — never a
     jump of more than one slide, never a "closest slide" pixel guess. */
  const EDGE_MAX = 56;
  const EDGE_COEFF = 0.55;
  const rubberBand = (overshoot) => (overshoot * EDGE_MAX * EDGE_COEFF) / (EDGE_MAX + EDGE_COEFF * overshoot);

  function attachDrag(track, carousel) {
    let dragging = false;
    let dragMoved = false;
    let startX = 0;
    let baseX = 0;

    const bounds = () => {
      const a = carousel.positionX(0);
      const b = carousel.positionX(carousel.getMaxIndex());
      return a <= b ? [a, b] : [b, a];
    };

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      startX = e.clientX;
      baseX = carousel.positionX(carousel.getIndex());
      track.style.transition = 'none';
      track.classList.add('is-dragging');
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* noop — progressive enhancement */ }
    });

    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 4) dragMoved = true;
      let target = baseX + delta;
      const [min, max] = bounds();
      if (target < min) target = min - rubberBand(min - target);
      else if (target > max) target = max + rubberBand(target - max);
      track.style.transform = `translate3d(${target}px,0,0)`;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      track.style.transition = '';
      const endX = typeof e.clientX === 'number' ? e.clientX : startX;
      const delta = endX - startX;
      const step = carousel.getStep();
      const threshold = Math.max(48, step * 0.18);
      if (Math.abs(delta) > threshold) {
        // The track's transform moves toward +x for positive delta no
        // matter which physical direction that is on screen, and
        // carousel.direction is the same sign used to turn an index
        // into that transform — so "delta and direction agree in sign"
        // is exactly "this drag moved the track toward a higher index".
        if (delta * carousel.direction > 0) carousel.next();
        else carousel.prev();
      } else {
        carousel.render(!reduceMotion); // short drag (or stopped at an edge) — elastic snap back
      }
      // Keep dragMoved true through the synthetic click the browser fires
      // right after this pointerup (swallowed by the capture-phase
      // listener below), then release it so it can't linger and block a
      // later, unrelated click (e.g. a keyboard-activated one).
      setTimeout(() => { dragMoved = false; }, 0);
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // Swallow the click a real drag would otherwise fire on the frame
    // button underneath it, so swiping never accidentally opens the
    // lightbox.
    track.addEventListener(
      'click',
      (e) => {
        if (dragMoved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }

  /* ================= Main carousel ================= */
  const gallery = createIndexCarousel({
    track: trackEl,
    viewport: viewportEl,
    itemCount: total,
    direction: 1, // slide 0 rests flush at the right (row-reverse track, see CSS); advancing pushes the track further right
  });

  const updateArrows = () => {
    if (prevBtn) prevBtn.disabled = gallery.getIndex() <= 0;
    if (nextBtn) nextBtn.disabled = gallery.getIndex() >= gallery.getMaxIndex();
  };

  const preloadAround = (i) => {
    [i - 1, i, i + 1].forEach((n) => {
      if (n < 0 || n >= total) return;
      const img = slides[n].querySelector('img');
      if (img) img.loading = 'eager'; // upgrade the neighbours so the next/prev slide is already decoded
    });
  };

  gallery.onChange((i) => {
    updateArrows();
    preloadAround(i);
  });

  if (nextBtn) nextBtn.addEventListener('click', () => gallery.next());
  if (prevBtn) prevBtn.addEventListener('click', () => gallery.prev());

  attachDrag(trackEl, gallery);

  // Tapping (not dragging) a frame opens the lightbox at that photo.
  slides.forEach((slide, i) => {
    const btn = slide.querySelector('[data-cap-open]');
    if (btn) btn.addEventListener('click', () => openLightbox(i));
  });

  gallery.measure();
  gallery.render(false);
  updateArrows();
  preloadAround(0);

  let resizeTimer;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        gallery.measure();
        gallery.render(false);
        updateArrows();
      }, 120);
    },
    { passive: true }
  );

  /* ================= Lightbox (full-screen viewer, same drag model) ================= */
  const lightboxCarousel = createIndexCarousel({
    track: lightboxTrack,
    viewport: lightboxViewport,
    itemCount: total,
    direction: -1, // plain left-to-right track — advancing moves it left
  });
  let lbOpen = false;
  let lastFocused = null;

  const lbPreload = (i) => {
    [i - 1, i, i + 1].forEach((n) => {
      if (n < 0 || n >= total) return;
      const img = lightboxSlides[n].querySelector('img');
      if (img && !img.src && sources[n]) img.src = sources[n];
    });
  };

  lightboxCarousel.onChange((i) => lbPreload(i));

  attachDrag(lightboxTrack, lightboxCarousel);

  function openLightbox(i) {
    lastFocused = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbOpen = true;
    lightboxCarousel.measure(); // must run after unhiding, or the track measures at zero width
    lightboxCarousel.goTo(i, false);
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lbOpen) return;
    lbOpen = false;
    lightbox.hidden = true;
    document.body.style.overflow = '';
    // Closing hands the visitor back to the same photo in the gallery,
    // even if they swiped further while the lightbox was open.
    gallery.goTo(lightboxCarousel.getIndex(), false);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (!lbOpen) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') lightboxCarousel.prev(); // reading order is RTL: visual right = previous
    else if (e.key === 'ArrowLeft') lightboxCarousel.next();
  });

  let lbResizeTimer;
  window.addEventListener(
    'resize',
    () => {
      if (!lbOpen) return;
      clearTimeout(lbResizeTimer);
      lbResizeTimer = setTimeout(() => {
        lightboxCarousel.measure();
        lightboxCarousel.render(false);
      }, 120);
    },
    { passive: true }
  );
})();
