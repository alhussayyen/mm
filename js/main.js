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
  // While the full-screen menu is open, the page content behind it is
  // still in normal tab order even though it's visually covered — a
  // keyboard user tabbing past the menu's last link would land on an
  // invisible link/button underneath it. `inert` (supported in every
  // current major browser) removes everything outside the menu from the
  // tab order and from screen-reader navigation until it's closed, same
  // as the lightbox below.
  const inertSiblings = ['#main', '.site-footer'];
  const setInertOutside = (isInert) => {
    inertSiblings.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.inert = isInert;
    });
  };
  if (menuToggle && mobileMenu) {
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('is-open');
      document.body.style.overflow = '';
      setInertOutside(false);
    };
    const openMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setInertOutside(true);
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
 * track moved with `transform: translate3d()`, a small clone buffer at each
 * end for the illusion of an infinite loop, and Pointer Events for drag.
 * Runs BEFORE the X-embed lazy-loader below so the cloned slides it creates
 * are already in the DOM when that script scans for `.press-card__embed`.
 */
(() => {
  'use strict';

  const root = document.getElementById('pressCarousel');
  const track = document.getElementById('pressTrack');
  if (!root || !track) return;

  // Mobile (<700px) uses a completely different, simpler single-tweet fade
  // rotator (see the dedicated IIFE right below this one) — no clones, no
  // drag, no arrows, no slide-transform. Bail out here so this track's
  // children stay exactly as authored (no clone buffer) for that simpler
  // rotator to drive directly. Desktop/tablet (≥700px) is untouched.
  if (window.matchMedia('(max-width: 699px)').matches) return;

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

    // translate3d, not translateX — same 3D form as the capabilities
    // carousel below, a more reliable GPU-layer-promotion hint paired
    // with will-change:transform above.
    const place = (index, animate) => {
      currentIndex = index;
      const x = -currentIndex * slideStep;
      if (!animate) {
        track.style.transition = 'none';
        track.style.transform = `translate3d(${x}px,0,0)`;
        void track.offsetHeight; // force reflow before restoring the transition
        track.style.transition = '';
      } else {
        track.style.transform = `translate3d(${x}px,0,0)`;
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

    /* ---- Autoplay: advance one tweet every 7s ---- */
    const AUTOPLAY_MS = 7000;
    let autoplayTimer = null;
    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };
    const startAutoplay = () => {
      if (reduceMotion) return; // an unrequested motion timer is exactly what prefers-reduced-motion asks sites to skip
      stopAutoplay();
      autoplayTimer = setInterval(goNext, AUTOPLAY_MS);
    };
    // Any manual move (arrow, drag) restarts the 7s countdown from zero
    // instead of letting autoplay fire moments later on top of it, and
    // hovering/focusing the carousel (e.g. to read or click into a tweet)
    // pauses it until the visitor moves away.
    const restartAutoplay = () => { if (autoplayTimer) startAutoplay(); };
    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', startAutoplay);
    root.addEventListener('focusin', stopAutoplay);
    root.addEventListener('focusout', startAutoplay);

    if (nextBtn) nextBtn.addEventListener('click', () => { goNext(); restartAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { goPrev(); restartAutoplay(); });

    // Initial position — synchronous, before the browser's first paint of
    // this section, so the clone buffer is never visible even for a frame.
    measure();
    place(currentIndex, false);
    startAutoplay();

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
      track.style.transform = `translate3d(${dragStartTranslate + delta}px,0,0)`;
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
      restartAutoplay();
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
 * ---------- Press section: mobile-only single-tweet fade rotator ----------
 * Mobile (<700px) needs a completely different browsing model than the
 * desktop carousel above (which bails out entirely at this breakpoint,
 * leaving the track's original slides unmodified — no clone buffer): show
 * exactly one tweet at a time, no arrows, no drag/swipe, no slide-transform
 * motion, just a plain automatic fade every 5s, with no user controls at
 * all. Desktop/tablet (≥700px) never runs this block.
 */
(() => {
  'use strict';

  if (!window.matchMedia('(max-width: 699px)').matches) return;

  const root = document.getElementById('pressCarousel');
  const track = document.getElementById('pressTrack');
  if (!root || !track) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = Array.from(track.children);
  if (slides.length < 2) return;

  const FADE_MS = 500;
  const INTERVAL_MS = 5000;

  slides.forEach((slide, i) => {
    slide.style.opacity = i === 0 ? '1' : '0';
    slide.style.display = i === 0 ? 'block' : 'none';
    slide.style.transition = reduceMotion ? 'none' : `opacity ${FADE_MS}ms ease`;
  });

  let current = 0;

  const showNext = () => {
    const next = (current + 1) % slides.length;
    const from = slides[current];
    const to = slides[next];

    if (reduceMotion) {
      from.style.display = 'none';
      from.style.opacity = '0';
      to.style.display = 'block';
      to.style.opacity = '1';
      current = next;
      return;
    }

    to.style.display = 'block';
    to.style.opacity = '0';
    void to.offsetHeight; // force a reflow so the opacity change below actually transitions instead of jumping straight to 1
    from.style.opacity = '0';
    to.style.opacity = '1';
    window.setTimeout(() => {
      from.style.display = 'none';
    }, FADE_MS);

    current = next;
  };

  let timer = null;
  const start = () => {
    if (timer) return;
    timer = window.setInterval(showNext, INTERVAL_MS);
  };
  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  start();

  // Pause the interval while the section is off-screen (purely a
  // performance/battery courtesy — not a user-facing control) and resume
  // it once it's back in view.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => (entry.isIntersecting ? start() : stop())),
      { threshold: 0.2 }
    );
    io.observe(root);
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

  // The infinite-loop carousel above clones a few slides at each end
  // (aria-hidden="true") so the wrap-around transition has something to
  // slide through. Mounting a full live X embed in each of those clones
  // too would roughly double the number of iframes/network requests for
  // content that's only ever on screen for the ~500ms of that transition
  // — skip them and only mount the real, reachable slides.
  const embeds = Array.from(document.querySelectorAll('.press-card__embed')).filter(
    (el) => !el.closest('[aria-hidden="true"]')
  );
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

  // X's widget only accepts a width between these two values (below TW_MIN
  // it won't render at all / falls back to its own default).
  const TW_MIN = 220;
  const TW_MAX = 550;

  // On the mobile two-up layout each card is narrower than TW_MIN, so X
  // can't render the tweet at the card's real size. Instead of letting it
  // overflow the card (clipped by the carousel viewport's overflow:hidden)
  // or leave blank space (rendered wider than the card), mount it at X's
  // own floor width and scale the whole embed down uniformly with
  // `transform: scale()` — proportions stay intact, nothing is cropped,
  // and there's no left-over gap because the scale factor is exactly
  // card-width / rendered-width. `top left` keeps the scale anchored at
  // the card's own edge (the track runs direction:ltr) instead of the
  // element's center, so the visible result lines up flush with the card
  // instead of spilling out one side and getting clipped on the other.
  const fitEmbedToCard = (container, iframe, renderedWidth) => {
    iframe.style.width = renderedWidth + 'px';
    iframe.style.maxWidth = 'none';
    iframe.style.transformOrigin = 'top left';
    container.style.overflow = 'hidden';

    let raf = null;
    const sync = () => {
      const cardWidth = container.clientWidth;
      if (!cardWidth) return;
      const scale = Math.min(1, cardWidth / renderedWidth);
      iframe.style.transform = `scale(${scale})`;
      const rect = iframe.getBoundingClientRect();
      if (rect.height) container.style.height = Math.ceil(rect.height) + 'px';
    };
    const scheduleSync = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };

    scheduleSync();
    if ('ResizeObserver' in window) {
      // X sets the iframe's real height asynchronously once the tweet's
      // content is known, and the card's own width can change (rotation,
      // window resize) — both need a re-sync.
      new ResizeObserver(scheduleSync).observe(iframe);
      new ResizeObserver(scheduleSync).observe(container);
    } else {
      window.addEventListener('resize', scheduleSync);
    }
  };

  const mountTweet = (container) => {
    const id = container.dataset.tweetId;
    if (!id) return;
    // Without an explicit width, X's widget picks its own natural render
    // width (its usual ~500-550px default) instead of the card's actual
    // width, so on any card narrower than that it gets clipped by the
    // carousel viewport's overflow:hidden, and on any card wider than the
    // tweet's actual content it leaves blank iframe background on one side
    // — both of which are exactly what was reported. Pinning `width` to the
    // card's real measured width makes the embed always render at the
    // card's own size, so `align: 'center'` above has no left-over space
    // left to center within. Cards narrower than X's own floor (the mobile
    // two-up layout) request the floor width instead and get scaled down
    // to fit — see fitEmbedToCard.
    const measuredWidth = container.clientWidth || container.getBoundingClientRect().width;
    const needsScale = measuredWidth > 0 && measuredWidth < TW_MIN;
    const requestWidth = measuredWidth
      ? Math.max(TW_MIN, Math.min(TW_MAX, Math.round(measuredWidth)))
      : undefined;
    withTimeout(loadTwitterScript(), 9000)
      .then((twttr) =>
        withTimeout(
          twttr.widgets.createTweet(id, container, {
            theme: 'light',
            dnt: true,
            conversation: 'none',
            align: 'center',
            ...(requestWidth ? { width: requestWidth } : {}),
          }),
          9000
        )
      )
      .then((el) => {
        const skeleton = container.querySelector('.press-card__skeleton');
        if (el) {
          if (skeleton) skeleton.remove();
          if (needsScale && requestWidth) fitEmbedToCard(container, el, requestWidth);
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
    let visibleSlots = 0;

    const clampIndex = (i) => Math.max(0, Math.min(maxIndex, i));

    function measure() {
      const first = track.children[0];
      if (!first) return;
      const rect = first.getBoundingClientRect();
      if (!rect.width) return; // track is hidden (lightbox not open yet) — nothing to measure
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = rect.width + gap;
      visibleSlots = viewport.clientWidth / step;
      // How many one-slide steps fit before the viewport would start
      // showing past the last slide. Flooring against the *measured*
      // visible slot count — not itemCount - 1 — is what stops the
      // track flush with its real content instead of overshooting
      // into empty space.
      const raw = itemCount - visibleSlots;
      let mi = Math.max(0, Math.floor(raw + 1e-6));
      // The stop at `mi` is normally the flush (end-anchored) stop, one
      // step-jump past the last uniform stop at `mi - 1`. That jump is
      // only guaranteed to fully reveal every photo along the way when
      // the viewport shows at least ~2 slots at once — with fewer (the
      // narrower mobile "1 full + a peek" layout), the photo that falls
      // right on the seam between those two stops ends up only ever
      // half-visible in both, then the carousel jumps straight past it to
      // the final photo. When that's the case, insert one more regular
      // stop first so that seam photo gets its own fully-visible resting
      // position before the final flush snap. On wider viewports (desktop)
      // this check is false and `mi` is untouched.
      if (mi > 0) {
        const lastUniformEnd = (mi - 1) + visibleSlots;
        const seamPhotoEnd = mi + 1;
        if (seamPhotoEnd > lastUniformEnd + 1e-6) mi += 1;
      }
      maxIndex = mi;
      index = clampIndex(index);
    }

    function positionX(i) {
      // Every stop except the last sits at a uniform i * step — each
      // transition moves by exactly one slide. The last stop is the one
      // exception: if it used that same uniform formula, the final photo
      // would only ever be revealed as a half-width trailing peek (there's
      // nothing after it to peek from). Anchoring the last stop flush
      // against the real end of the content instead guarantees the last
      // photo is always shown in full — the peek simply moves to the
      // leading edge for that one stop, same "n full + half peek" pattern,
      // just mirrored. Every other stop is completely unaffected.
      if (i === maxIndex && itemCount > visibleSlots) {
        return direction * (itemCount - visibleSlots) * step;
      }
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

  // Same reasoning as the mobile menu's inertSiblings above: everything
  // else on the page is still visually present (just covered by the
  // full-screen lightbox), so it needs to be taken out of the tab order
  // while the lightbox is open.
  const lbInertSiblings = ['#siteHeader', '#main', '.site-footer'];
  const setLbInertOutside = (isInert) => {
    lbInertSiblings.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.inert = isInert;
    });
  };

  function openLightbox(i) {
    lastFocused = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    setLbInertOutside(true);
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
    setLbInertOutside(false);
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
