document.documentElement.classList.remove('no-js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

// Wrap every word of an element in <span class="w">, keeping inner spans (.hl, .grad)
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const w = document.createElement('span');
          w.className = 'w';
          w.style.setProperty('--i', i++);
          w.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
  return el.querySelectorAll('.w');
}

// Hero: title word by word, watermark letter by letter
document.querySelectorAll('[data-split]').forEach(splitWords);

const watermark = document.querySelector('.hero__watermark');
if (watermark) {
  watermark.innerHTML = Array.from(watermark.textContent)
    .map((ch, i) => `<span class="ch" style="--i:${i}">${ch}</span>`)
    .join('');
}

// Duplicate marquee content so the loop is seamless
document.querySelectorAll('.marquee__track').forEach((track) => {
  Array.from(track.children).forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });
});

// Reveal sections as they enter the viewport
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealItems.forEach((el) => observer.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add('is-visible'));
}

if (!reduceMotion) {
  const hero = document.querySelector('.hero');
  const glow = document.querySelector('.hero__glow');
  const scrub = document.querySelector('[data-scrub]');
  const scrubWords = scrub ? splitWords(scrub) : [];

  // Portfolio strips: constant drift, sped up by scrolling, slowed on hover
  const strips = Array.from(document.querySelectorAll('.marquee--work')).map((el) => {
    el.classList.add('is-driven');
    const strip = {
      track: el.querySelector('.marquee__track'),
      dir: el.classList.contains('marquee--reverse') ? 1 : -1,
      x: 0,
      hover: false,
    };
    el.addEventListener('mouseenter', () => { strip.hover = true; });
    el.addEventListener('mouseleave', () => { strip.hover = false; });
    return strip;
  });

  // Hero glow eases toward the pointer
  let gx = 50, gy = 55, tx = 50, ty = 55;
  if (finePointer && hero) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
    });
    hero.addEventListener('pointerleave', () => { tx = 50; ty = 55; });
  }

  let lastY = window.scrollY;
  let boost = 0;
  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    const y = window.scrollY;
    const vh = window.innerHeight;

    // Scroll velocity feeds the strips, then decays
    boost += Math.min(Math.abs(y - lastY), 120) * 0.6;
    boost *= 0.92;
    lastY = y;

    strips.forEach((s) => {
      const half = s.track.scrollWidth / 2;
      const speed = s.hover ? 8 : 38 + boost;
      s.x += s.dir * speed * dt;
      if (s.x <= -half) s.x += half;
      if (s.x > 0) s.x -= half;
      s.track.style.transform = `translate3d(${s.x}px,0,0)`;
    });

    if (glow) {
      gx += (tx - gx) * 0.06;
      gy += (ty - gy) * 0.06;
      glow.style.setProperty('--gx', `${gx}%`);
      glow.style.setProperty('--gy', `${gy}%`);
    }

    if (watermark && y < vh * 1.2) {
      watermark.style.transform = `translate(-50%, ${y * 0.3}px)`;
    }

    if (scrub) {
      const r = scrub.getBoundingClientRect();
      const progress = (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.3);
      const lit = Math.round(Math.max(0, Math.min(1, progress)) * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('on', i < lit));
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
