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
 * ---------- Capabilities section: single-image swipe carousel + lightbox ----------
 * Same behaviour on every breakpoint (no separate mobile/desktop code
 * paths) and on touch or mouse (Pointer Events unify both): one photo on
 * screen at a time, a real-time 1:1 drag that follows the pointer, an
 * elastic snap-back on a short drag, a smooth advance to the next/prev
 * photo once the drag passes a distance threshold, GPU-accelerated
 * transform:translate3d(), a peek of both neighbours (see --cap-peek in
 * css/style.css), and a full-screen lightbox with identical drag
 * behaviour that hands the visitor back to the same photo in the gallery
 * on close. Section colours/type are untouched — only the browsing
 * mechanics are new. No third-party carousel library is used.
 */
(() => {
  'use strict';

  const carousel = document.getElementById('capCarousel');
  const viewport = document.getElementById('capViewport');
  const track = document.getElementById('capTrack');
  const prevBtn = document.getElementById('capPrev');
  const nextBtn = document.getElementById('capNext');
  const lightbox = document.getElementById('capLightbox');
  const lightboxViewport = document.getElementById('capLightboxViewport');
  const lightboxTrack = document.getElementById('capLightboxTrack');
  const lightboxClose = document.getElementById('capLightboxClose');
  if (!carousel || !viewport || !track || !lightbox || !lightboxTrack) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slides = Array.from(track.children);
  const lightboxSlides = Array.from(lightboxTrack.children);
  const total = slides.length;
  if (!total) return;

  // Pull the real image URLs straight from the main carousel — the
  // lightbox never keeps its own separate, hardcoded copy of the list.
  const sources = slides.map((slide) => {
    const img = slide.querySelector('img');
    return img ? img.getAttribute('src') : '';
  });

  let index = 0;
  let slideStep = 0;    // one slide's full width, including the gap
  let centerOffset = 0; // px kept clear on each side so both neighbours peek through

  /* ---------- Small helper shared by the gallery drag and the lightbox drag ---------- */
  const attachDrag = (trackEl, opts) => {
    let dragging = false;
    let dragMoved = false;
    let startX = 0;
    let baseX = 0;

    trackEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      startX = e.clientX;
      baseX = opts.getX();
      trackEl.style.transition = 'none';
      trackEl.classList.add('is-dragging');
      try { trackEl.setPointerCapture(e.pointerId); } catch (err) { /* noop — progressive enhancement */ }
    });

    trackEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 4) dragMoved = true;
      // Real-time: the photo tracks the pointer directly, no easing while dragging.
      trackEl.style.transform = `translate3d(${baseX + delta}px,0,0)`;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      trackEl.classList.remove('is-dragging');
      trackEl.style.transition = '';
      const endX = typeof e.clientX === 'number' ? e.clientX : startX;
      const delta = endX - startX;
      const threshold = Math.max(48, opts.getStep() * 0.18);
      if (Math.abs(delta) > threshold) {
        if (delta < 0) opts.next();
        else opts.prev();
      } else {
        opts.settle(); // short drag — elastic snap back to the current photo
      }
      // Keep dragMoved true through the synthetic click the browser fires
      // right after this pointerup (that's what the capture-phase listener
      // below needs to swallow), then release it so it can't linger and
      // block an unrelated later click (e.g. a keyboard-activated one).
      setTimeout(() => { dragMoved = false; }, 0);
    };
    trackEl.addEventListener('pointerup', endDrag);
    trackEl.addEventListener('pointercancel', endDrag);

    // Swallow the click a real drag would otherwise fire on the frame
    // button underneath it, so swiping never accidentally opens the
    // lightbox — same technique the press carousel uses above.
    trackEl.addEventListener(
      'click',
      (e) => {
        if (dragMoved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  };

  /* ================= Main carousel ================= */
  const measure = () => {
    const rect = slides[0].getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    slideStep = rect.width + gap;
    centerOffset = Math.max(0, (viewport.clientWidth - rect.width) / 2);
  };

  const currentX = () => centerOffset - index * slideStep;

  const updateArrows = () => {
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= total - 1;
  };

  const preloadAround = (i) => {
    [i - 1, i, i + 1].forEach((n) => {
      if (n < 0 || n >= total) return;
      const img = slides[n].querySelector('img');
      if (img) img.loading = 'eager'; // upgrade the neighbours so the next/prev slide is already decoded
    });
  };

  const place = (animate) => {
    const x = currentX();
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translate3d(${x}px,0,0)`;
    if (!animate) {
      void track.offsetHeight; // reflow so the transition re-enables cleanly next time
      track.style.transition = '';
    }
    updateArrows();
  };

  let animating = false;
  track.addEventListener('transitionend', (e) => {
    if (e.target === track && e.propertyName === 'transform') animating = false;
  });

  const goTo = (i, animate) => {
    index = Math.max(0, Math.min(total - 1, i));
    const willAnimate = animate !== false && !reduceMotion;
    animating = willAnimate;
    place(willAnimate);
    preloadAround(index);
  };
  const goNext = () => { if (!animating) goTo(index + 1); };
  const goPrev = () => { if (!animating) goTo(index - 1); };

  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (prevBtn) prevBtn.addEventListener('click', goPrev);

  attachDrag(track, {
    getX: currentX,
    getStep: () => slideStep,
    next: goNext,
    prev: goPrev,
    settle: () => place(!reduceMotion),
  });

  // Tapping (not dragging) a frame opens the lightbox at that photo.
  slides.forEach((slide, i) => {
    const btn = slide.querySelector('[data-cap-open]');
    if (btn) btn.addEventListener('click', () => openLightbox(i));
  });

  measure();
  place(false);
  preloadAround(0);

  let resizeTimer;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { measure(); place(false); }, 120);
    },
    { passive: true }
  );

  /* ================= Lightbox (full-screen viewer, same drag model) ================= */
  let lbIndex = 0;
  let lbStep = 0;
  let lbOpen = false;
  let lastFocused = null;

  const lbMeasure = () => { lbStep = lightboxViewport.clientWidth; };
  const lbCurrentX = () => -lbIndex * lbStep;

  const lbPlace = (animate) => {
    const x = lbCurrentX();
    if (!animate) lightboxTrack.style.transition = 'none';
    lightboxTrack.style.transform = `translate3d(${x}px,0,0)`;
    if (!animate) {
      void lightboxTrack.offsetHeight;
      lightboxTrack.style.transition = '';
    }
  };

  const lbPreload = (i) => {
    [i - 1, i, i + 1].forEach((n) => {
      if (n < 0 || n >= total) return;
      const img = lightboxSlides[n].querySelector('img');
      if (img && !img.src && sources[n]) img.src = sources[n];
    });
  };

  const lbGoTo = (i, animate) => {
    lbIndex = Math.max(0, Math.min(total - 1, i));
    lbPlace(animate !== false && !reduceMotion);
    lbPreload(lbIndex);
  };

  attachDrag(lightboxTrack, {
    getX: lbCurrentX,
    getStep: () => lbStep,
    next: () => lbGoTo(lbIndex + 1),
    prev: () => lbGoTo(lbIndex - 1),
    settle: () => lbPlace(!reduceMotion),
  });

  function openLightbox(i) {
    lbIndex = i;
    lastFocused = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbMeasure();
    lbPlace(false);
    lbPreload(lbIndex);
    lbOpen = true;
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lbOpen) return;
    lbOpen = false;
    lightbox.hidden = true;
    document.body.style.overflow = '';
    // Closing hands the visitor back to the same photo in the gallery,
    // even if they swiped further while the lightbox was open.
    goTo(lbIndex, false);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (!lbOpen) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') lbGoTo(lbIndex - 1); // reading order is RTL: visual right = previous
    else if (e.key === 'ArrowLeft') lbGoTo(lbIndex + 1);
  });

  let lbResizeTimer;
  window.addEventListener(
    'resize',
    () => {
      if (!lbOpen) return;
      clearTimeout(lbResizeTimer);
      lbResizeTimer = setTimeout(() => { lbMeasure(); lbPlace(false); }, 120);
    },
    { passive: true }
  );
})();
