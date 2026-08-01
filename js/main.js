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
