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

  if ('IntersectionObserver' in window) {
    const embedIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            mountTweet(entry.target);
            embedIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '200px 0px' }
    );
    embeds.forEach((el) => embedIO.observe(el));
  } else {
    // No IO support: load embeds directly (still async/non-blocking).
    embeds.forEach(mountTweet);
  }
})();

/**
 * ---------- Capabilities (Services) section: mobile-only scroll-jack ----------
 * Below 640px ONLY. On desktop/tablet this script does nothing — the
 * `.cap-gallery` grid is never touched, no wrapper elements are ever
 * created, and nothing is added to the DOM.
 *
 * On mobile, once the gallery reaches the top of the viewport it pins
 * (CSS `position:sticky`) and scroll input (wheel notch or one finger
 * swipe) is intercepted to step exactly one service at a time — never
 * more than one per scroll — sliding right-to-left going forward and
 * left-to-right in reverse. There is no drag-to-scrub, no buttons, no
 * arrows: scroll is the only control surface. Once the last service is
 * reached, the section unpins and the page continues scrolling normally;
 * scrolling back up re-pins and reverses the sequence symmetrically.
 */
(() => {
  'use strict';

  const section = document.getElementById('capabilities');
  const gallery = document.getElementById('capGallery');
  if (!section || !gallery) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mq = window.matchMedia('(max-width: 639px)');

  const tiles = Array.from(gallery.children);
  const total = tiles.length;
  if (total < 2 || reduceMotion) return;

  const TRANSITION_MS = 620;
  const STEP_THRESHOLD_PX = 12;

  let scroller = null;
  let stage = null;
  let active = false; // true once #capGallery has been moved into the pin wrapper
  let index = 0;
  let animating = false;
  let wheelLocked = false;
  let touchActive = false;
  let touchLocked = false;
  let touchStartY = 0;

  const place = (animate) => {
    if (!animate) gallery.style.transition = 'none';
    gallery.style.transform = `translateX(${-index * 100}%)`;
    if (!animate) {
      void gallery.offsetHeight; // reflow, so the transition re-enables cleanly on the next step
      gallery.style.transition = '';
    }
  };

  const isStuck = () => !!stage && Math.abs(stage.getBoundingClientRect().top) < 1.5;

  const goNext = () => {
    if (animating || index >= total - 1) return;
    animating = true;
    index += 1;
    place(true);
  };

  const goPrev = () => {
    if (animating || index <= 0) return;
    animating = true;
    index -= 1;
    place(true);
  };

  gallery.addEventListener('transitionend', (e) => {
    if (e.target === gallery && e.propertyName === 'transform') animating = false;
  });

  const onWheel = (e) => {
    if (!active || !isStuck()) return;
    const goingDown = e.deltaY > 0;
    if (goingDown && index >= total - 1) return; // last service reached — release, let the page scroll on
    if (!goingDown && index <= 0) return; // first service — release, let the page scroll up
    e.preventDefault();
    if (wheelLocked || animating) return;
    wheelLocked = true;
    if (goingDown) goNext();
    else goPrev();
    setTimeout(() => { wheelLocked = false; }, TRANSITION_MS + 80);
  };

  const onTouchStart = (e) => {
    touchStartY = e.touches[0].clientY;
    touchActive = true;
    touchLocked = false;
  };

  const onTouchMove = (e) => {
    if (!active || !touchActive || !isStuck()) return;
    const dy = touchStartY - e.touches[0].clientY; // >0: finger moved up = scroll-down intent
    if (Math.abs(dy) < STEP_THRESHOLD_PX) return;
    const goingDown = dy > 0;
    if (goingDown && index >= total - 1) return;
    if (!goingDown && index <= 0) return;
    e.preventDefault();
    if (touchLocked || animating) return;
    touchLocked = true;
    if (goingDown) goNext();
    else goPrev();
  };

  const onTouchEnd = () => {
    touchActive = false;
    touchLocked = false;
  };

  const buildDom = () => {
    if (active) return;
    scroller = document.createElement('div');
    scroller.className = 'cap-scroller';
    stage = document.createElement('div');
    stage.className = 'cap-scroller__stage';
    gallery.parentNode.insertBefore(scroller, gallery);
    stage.appendChild(gallery);
    scroller.appendChild(stage);
    // The horizontal slide is the reveal now — settle the fade-up state so
    // it doesn't fight the transform on tiles that haven't fully intersected.
    tiles.forEach((t) => t.classList.add('in-view'));
    index = 0;
    place(false);
    document.documentElement.classList.add('has-cap-jack');
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    active = true;
  };

  const teardownDom = () => {
    if (!active) return;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    document.documentElement.classList.remove('has-cap-jack');
    gallery.style.transform = '';
    gallery.style.transition = '';
    section.insertBefore(gallery, scroller);
    scroller.remove();
    scroller = null;
    stage = null;
    animating = false;
    wheelLocked = false;
    touchLocked = false;
    touchActive = false;
    active = false;
  };

  const syncMode = () => {
    if (mq.matches) buildDom();
    else teardownDom();
  };

  syncMode();
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', syncMode);
  else if (typeof mq.addListener === 'function') mq.addListener(syncMode); // Safari <14 fallback

  let resizeTimer;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (active) place(false);
      }, 120);
    },
    { passive: true }
  );
})();
