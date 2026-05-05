/* ─── Nav active state + scroll border ─────────────────────────────────── */
(function () {
  const links = document.querySelectorAll('.nav__links a');
  const path = window.location.pathname;
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === '/' && (path === '/' || path === '/index.html')) {
      link.classList.add('active');
    } else if (href !== '/' && path.startsWith(href)) {
      link.classList.add('active');
    }
  });

  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();

/* ─── Page transitions ──────────────────────────────────────────────────── */
(function () {
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (a.target === '_blank') return;
    try {
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.hash && url.pathname === location.pathname) return;
      e.preventDefault();
      document.body.classList.remove('page-visible');
      setTimeout(function () { location.href = url.href; }, 200);
    } catch (_) {}
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) requestAnimationFrame(function () { document.body.classList.add('page-visible'); });
  });
})();

/* ─── Product filter ────────────────────────────────────────────────────── */
function initFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('[data-style][data-color]');
  if (!filterBtns.length) return;

  const active = { style: 'all', color: 'all' };

  function applyFilter() {
    cards.forEach(card => {
      const styles = card.dataset.style ? card.dataset.style.split(',') : [];
      const colors = card.dataset.color ? card.dataset.color.split(',') : [];
      const matchStyle = active.style === 'all' || styles.includes(active.style);
      const matchColor = active.color === 'all' || colors.includes(active.color);
      card.classList.toggle('hidden', !(matchStyle && matchColor));
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;
      active[group] = value;

      document.querySelectorAll(`.filter-btn[data-group="${group}"]`)
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      applyFilter();
    });
  });
}

/* ─── Lightbox ──────────────────────────────────────────────────────────── */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector('.lightbox__img');
  const closeBtn = lightbox.querySelector('.lightbox__close');

  document.querySelectorAll('.room-gallery img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
    });
  });

  function close() { lightbox.classList.remove('open'); }
  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => document.body.classList.add('page-visible'));
  initFilter();
  initLightbox();
  initHeroParallax();
  fetchInstagram();
});

/* ─── Shared utilities ──────────────────────────────────────────────────── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : '#';
}

/* ─── Card slideshow HTML builder ───────────────────────────────────────── */
function slideshowHtml(images, _isSquare, altText) {
  if (!images || images.length <= 1) {
    const src = (images && images[0]) || '';
    return `<img src="${esc(src)}" alt="${esc(altText)}" loading="lazy" />`;
  }
  const dots = images.map((_, i) =>
    `<span${i === 0 ? ' class="active"' : ''}></span>`
  ).join('');
  const imgs = images.map(src =>
    `<img src="${esc(src)}" alt="${esc(altText)}" loading="lazy" />`
  ).join('');
  return `<div class="card__slideshow"><div class="card__slideshow-track">${imgs}</div><button class="card__slideshow-btn card__slideshow-btn--prev" aria-label="Previous image">&#8249;</button><button class="card__slideshow-btn card__slideshow-btn--next" aria-label="Next image">&#8250;</button><div class="card__slideshow-dots">${dots}</div></div>`;
}

/* ─── Card slideshows initialiser ───────────────────────────────────────── */
function initSlideshows() {
  document.querySelectorAll('.card__slideshow:not([data-ss-init])').forEach(ss => {
    ss.dataset.ssInit = '1';
    const track = ss.querySelector('.card__slideshow-track');
    const imgs = track.querySelectorAll('img');
    if (imgs.length <= 1) return;
    let current = 0;
    const dots = ss.querySelectorAll('.card__slideshow-dots span');

    function goTo(n) {
      current = (n + imgs.length) % imgs.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    ss.querySelector('.card__slideshow-btn--prev')
      .addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); resetTimer(); });
    ss.querySelector('.card__slideshow-btn--next')
      .addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); resetTimer(); });

    let timer = setInterval(() => goTo(current + 1), 4000);
    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 4000);
    }
    ss.addEventListener('mouseenter', () => clearInterval(timer));
    ss.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(current + 1), 4000); });

    goTo(0);
  });
}

/* ─── Hero parallax ─────────────────────────────────────────────────────── */
function initHeroParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const img = hero.querySelector('.hero__image img');
  if (!img) return;

  let tx = 0, ty = 0, cx = 0, cy = 0;
  function lerp(a, b, t) { return a + (b - a) * t; }

  (function tick() {
    cx = lerp(cx, tx, 0.08);
    cy = lerp(cy, ty, 0.08);
    img.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px) scale(1.05)';
    requestAnimationFrame(tick);
  })();

  hero.addEventListener('mousemove', function (e) {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left - r.width  / 2) / r.width)  * -8;
    ty = ((e.clientY - r.top  - r.height / 2) / r.height) * -8;
  });
  hero.addEventListener('mouseleave', function () { tx = 0; ty = 0; });
}

/* ─── Pinterest save buttons ────────────────────────────────────────────── */
function initPinterestSave(images) {
  const pageUrl   = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(document.title);
  const pinSvg =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405' +
    '.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171' +
    '-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777' +
    ' 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561' +
    '-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267' +
    '-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398' +
    ' 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853' +
    'c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627' +
    ' 0 12 0z"/></svg>';

  Array.from(images).forEach(function (img) {
    const wrap = document.createElement('div');
    wrap.className = 'pin-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    const pinUrl = 'https://pinterest.com/pin/create/button/?url=' + pageUrl +
      '&media=' + encodeURIComponent(img.src) +
      '&description=' + pageTitle;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pin-btn';
    btn.setAttribute('aria-label', 'Save to Pinterest');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      window.open(pinUrl, '_blank', 'noopener,noreferrer');
    });
    btn.innerHTML = pinSvg + '<span>save</span>';
    wrap.appendChild(btn);
  });
}

/* ─── Instagram / Behold feed ───────────────────────────────────────────── */
async function fetchInstagram() {
  try {
    const res = await fetch('https://feeds.behold.so/Pa04gVGeANiMLhJmdbSB');
    const data = await res.json();
    const posts = data.posts || [];
    const grid = document.getElementById('instagram-grid');
    if (!grid) return;

    posts.slice(0, 6).forEach(function (post) {
      const src = (post.sizes && post.sizes.medium && post.sizes.medium.mediaUrl)
        || post.thumbnailUrl
        || post.mediaUrl;
      const rawCaption = post.caption || '';
      const caption = rawCaption.length > 80 ? rawCaption.slice(0, 80) + '…' : rawCaption;
      const descHtml = caption ? `<p class="card__desc">${esc(caption)}</p>` : '';

      grid.insertAdjacentHTML('beforeend', `
        <a class="card" href="${esc(post.permalink)}" target="_blank" rel="noopener">
          <div class="card__image">
            <img src="${esc(src)}" alt="${esc(rawCaption || 'thethree.edit on instagram')}" loading="lazy" />
          </div>
          <div class="card__overlay">
            ${descHtml}
            <span class="card__link">view on instagram →</span>
          </div>
        </a>
      `);
    });
  } catch (_) {
    const section = document.getElementById('instagram');
    if (section) section.classList.add('hidden');
  }
}

/* ─── SEO injection ─────────────────────────────────────────────────────── */
function injectSEO(title, description, ogImage) {
  if (title) document.title = title;
  function upsertMeta(nameOrProp, val) {
    if (!val) return;
    const isOg = nameOrProp.startsWith('og:');
    const sel = isOg
      ? `meta[property="${nameOrProp}"]`
      : `meta[name="${nameOrProp}"]`;
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      if (isOg) el.setAttribute('property', nameOrProp);
      else el.setAttribute('name', nameOrProp);
      document.head.appendChild(el);
    }
    el.setAttribute('content', val);
  }
  upsertMeta('description', description);
  upsertMeta('og:title', title);
  upsertMeta('og:description', description);
  upsertMeta('og:type', 'website');
  upsertMeta('og:url', window.location.href);
  if (ogImage) upsertMeta('og:image', ogImage);
  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', title);
  upsertMeta('twitter:description', description);
  if (ogImage) upsertMeta('twitter:image', ogImage);
}
