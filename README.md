# محمد الحصين — Personal Brand Site

A from-scratch personal brand experience for Mohammed Alhussayyen (photographer,
visual storyteller, media production founder). Built as a cinematic, editorial
scroll journey rather than a conventional portfolio grid.

## Stack

Plain HTML5 / CSS3 / vanilla JS — no build step, no framework. Chosen deliberately:
fastest possible load, best Lighthouse score, zero dependency risk, and trivial to
host anywhere (Vercel, Netlify, GitHub Pages, or any static host).

```
site/
├── index.html
├── css/style.css      — design system (tokens, layout, placeholder system, motion)
├── js/main.js          — scroll reveals, header state, mobile nav, counters, parallax
└── assets/img/         — logo marks (real asset) + where final photography goes
```

## Replacing image placeholders

Every image slot is a `<figure class="ph ...">` element with a `data-caption`
describing exactly what should go there (framing, mood, subject). To swap one in:

1. Add the real image to `assets/img/`.
2. Replace the `<div class="ph__texture">` placeholder markup inside that `<figure>`
   with an `<img src="assets/img/your-file.jpg" alt="..." loading="lazy">`.
3. Keep the existing `ph--*` aspect-ratio class (e.g. `ph--portrait`, `ph--wide`,
   `ph--cinema`) so layout doesn't shift — or adjust the CSS aspect-ratio if the
   real image has a different crop.

The **Bono save** section (`.iconic`) is intentionally built as its own dedicated
cinematic moment — replace that placeholder first; it's the section most likely to
be judged on impact.

## Content sources

Copy was rewritten from scratch (not copied) using two sources for facts only:
the previous Squarespace site (screenshots) and the uploaded PDF profile
(`mohammed alhussayyen.pdf` — bio, philosophy quote, skills, achievements list,
client roster). All client names and tournament coverage listed on the site are
taken directly from those materials.

## What's deliberately not done yet

- Real photography — placeholders throughout, by design (per brief).
- English-language version — the source material (old site + PDF) is Arabic-only;
  a bilingual toggle would be a separate, well-scoped follow-up.
- No `og:image` production asset yet — currently points at the logo mark.

## Local preview

Any static server works, e.g.:

```
cd site
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
