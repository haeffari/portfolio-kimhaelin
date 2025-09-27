// ──────────────────────────────────────────────
// 필수 유틸 (짧은 선택자)
// ──────────────────────────────────────────────
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ──────────────────────────────────────────────
// 페이지 로드 시 스크롤 위치 맨 위 고정
// ──────────────────────────────────────────────
document.documentElement.style.scrollBehavior = 'auto';
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
history.replaceState(null, '', location.pathname + location.search); // 해시 제거
window.addEventListener('load', () => window.scrollTo(0, 0));

// ──────────────────────────────────────────────
// 같은 페이지 내 앵커 스무스 스크롤링
// ──────────────────────────────────────────────
(function smoothAnchors(){
  // 사용자 환경이 'reduced motion'이면 스무스 꺼주기
  const prefersNoMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 문서 루트 & 헤더 높이 가져오기
  const root = document.documentElement;
  const getHeaderH = () => {
    const v = getComputedStyle(root).getPropertyValue('--header-h').trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // 같은 페이지 내 앵커만 대상
  document.addEventListener('click', (e) => {
    // a 요소 또는 내부 아이콘 클릭 등 대응
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;

    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return; // 빈 #는 무시

    const id = hash.slice(1);
    const target = document.getElementById(id);
    if (!target) return; // 대상 없으면 기본동작(혹은 아무것도) 유지

    // 다른 스크립트와 충돌 방지: 기본 스크롤 막고 우리가 처리
    e.preventDefault();

    const headerH = getHeaderH();
    const rect = target.getBoundingClientRect();
    const top = window.scrollY + rect.top - headerH - 8; // 여유 8px

    // 진짜 스무스 이동
    window.scrollTo({
      top,
      behavior: prefersNoMotion ? 'auto' : 'smooth'
    });

    // 주소창 해시 갱신(히스토리 남김). 원치 않으면 replaceState로 교체.
    history.pushState(null, '', hash);
  });

  // 어떤 코드가 인라인으로 scrollBehavior='auto'를 박아두면 풀어주기
  addEventListener('pageshow', () => {
    if (root.style.scrollBehavior) root.style.scrollBehavior = '';
  });
})();

// ──────────────────────────────────────────────
// GSAP 플러그인 등록
// ──────────────────────────────────────────────
gsap.registerPlugin(Flip, SplitText, ScrollTrigger);

// 페이지 새로고침·뒤로가기 시 항상 맨 위로 고정
(function startAtTop() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const forceTop = () => window.scrollTo(0, 0);
  window.addEventListener('load', forceTop, { once: true });
  window.addEventListener('pageshow', (e) => e.persisted && forceTop());
})();

// ──────────────────────────────────────────────
// THEME TOGGLE (라벨/접근성 동기화)
// ──────────────────────────────────────────────
(function themeToggle() {
  const root = document.documentElement;
  const btn  = document.getElementById('btnTheme');
  if (!btn) return;

  const labelEl = btn.querySelector('.btn_theme__label');

  const setBtnLabel = (label) => {
    if (labelEl) labelEl.textContent = label;
    btn.setAttribute('aria-label', label);
  };

  const getTheme = () => root.getAttribute('data-theme') || 'light';

  const setTheme = (t) => {
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    localStorage.setItem('theme', t);
    const isDark = (t === 'dark');
    btn.setAttribute('aria-pressed', String(isDark));
    setBtnLabel(isDark ? 'dark mode' : 'light mode');
  };

  const saved = localStorage.getItem('theme');
  if (saved) root.setAttribute('data-theme', saved);
  setTheme(getTheme());

  btn.addEventListener('click', () => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  });
})();

// ──────────────────────────────────────────────
// 카운터 숫자 생성 & 애니메이션
// ──────────────────────────────────────────────
function createCounterDigits() {
  const c1 = $('.counter_1');
  const c2 = $('.counter_2');
  const c3 = $('.counter_3');
  if (!c1 || !c2 || !c3) return;

  [['0','num'], ['1','num num1offset1']].forEach(([t, cls]) => {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = t;
    c1.appendChild(d);
  });

  for (let i = 0; i <= 10; i++) {
    const d = document.createElement('div');
    d.className = i === 1 ? 'num num1offset2' : 'num';
    d.textContent = (i === 10) ? '0' : String(i);
    c2.appendChild(d);
  }

  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div');
    d.className = 'num';
    d.textContent = String(i % 10);
    c3.appendChild(d);
  }
  const last = document.createElement('div');
  last.className = 'num';
  last.textContent = '0';
  c3.appendChild(last);
}

const animateCounter = (counterEl, duration, delay = 0) => {
  if (!counterEl) return;
  const h = counterEl.querySelector('.num')?.clientHeight || 0;
  const total = (counterEl.querySelectorAll('.num').length - 1) * h;
  gsap.to(counterEl, { y: -total, duration, delay, ease: 'power2.inOut' });
};

// ──────────────────────────────────────────────
// 이미지 FLIP + scale 애니메이션
// ──────────────────────────────────────────────
function animateImages() {
  const images = $$('.img');
  if (!images.length) return gsap.timeline();

  images.forEach((img) => img.classList.remove('animate_out'));
  const state = Flip.getState(images);
  images.forEach((img) => img.classList.add('animate_out'));

  const tl = gsap.timeline().add(
    Flip.from(state, { duration: 1, stagger: 0.1, ease: 'power3.inOut' })
  );

  images.forEach((img, i) => {
    tl.to(img, { scale: 2, duration: 0.45, ease: 'power3.in'  }, i * 0.1 + 0.025)
      .to(img, { scale: 1.0, duration: 0.45, ease: 'power3.out' }, i * 0.1 + 0.5);
  });

  return tl;
}

// ──────────────────────────────────────────────
// 텍스트 래핑 + 초기 상태
// ──────────────────────────────────────────────
function wrapTextToReveal(selector) {
  $$(selector).forEach((el) => {
    if (el.querySelector('.reveal')) return;
    const txt = el.textContent;
    el.innerHTML = `<span class="reveal">${txt}</span>`;
  });
}

function prepareHeroTextReveal() {
  wrapTextToReveal('.logo, .nav_links a, .btn_cta, .hero_footer p, .hero_wordmark, .hero_title .kicker, .hero_title .lede');

  const label = document.querySelector('#btnTheme .btn_theme__label');
  if (label && !label.classList.contains('reveal')) label.classList.add('reveal');

  gsap.set('.reveal', { yPercent: 125, autoAlpha: 0 });
}

// ──────────────────────────────────────────────
// Hero 워드마크 SplitText + ScrollTrigger
// ──────────────────────────────────────────────
function setupHeroWordmark() {
  const el = document.querySelector('.hero_wordmark');
  if (!el) return null;

  const split = new SplitText(el, { type: 'chars' });
  const reset = () => gsap.set(split.chars, { y: 20, autoAlpha: 0 });

  reset();

  const tl = gsap.timeline({ paused: true }).to(split.chars, {
    y: -50, autoAlpha: 1, duration: 0.8, ease: 'power2.out', stagger: 0.12
  });

  const st = ScrollTrigger.create({
    trigger: '.hero',
    start: 'top 10%',
    onEnter:     () => tl.restart(true),
    onEnterBack: () => tl.restart(true),
    onLeave:     () => { tl.pause(0); reset(); },
    onLeaveBack: () => { tl.pause(0); reset(); }
  });

  if (st.isActive || window.scrollY === 0) {
    requestAnimationFrame(() => tl.restart(true));
  }

  window.addEventListener('pageshow', (e) => {
    const nav = performance.getEntriesByType('navigation')[0];
    if ((e.persisted || nav?.type === 'reload') && window.scrollY === 0) {
      reset(); tl.restart(true);
    }
  });

  const logo = document.querySelector('.logo[href="#top"]') || document.querySelector('.logo');
  logo?.addEventListener('click', (ev) => {
    ev.preventDefault();
    history.replaceState(null, '', location.pathname + location.search + '#top');
    gsap.to(window, {
      duration: 0.01,
      scrollTo: 0,
      onComplete: () => { reset(); tl.restart(true); }
    });
  });

  return tl;
}

// ──────────────────────────────────────────────
// Section 진입 시 Mask Reveal
// ──────────────────────────────────────────────
function initMaskReveal() {
  if (!window.gsap || !window.ScrollTrigger) return;
  $$('.mask_reveal').forEach((el) => {
    const tl = gsap.timeline({ paused: true })
      .fromTo(el, { clipPath: 'inset(0 100% 0 0)' },
                   { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power3.out' })
      .fromTo(el, { yPercent: 20, opacity: 0 },
                   { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0);

    ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      onEnter: () => tl.restart(true),
      onEnterBack: () => tl.restart(true),
      onLeave: () => tl.pause(0),
      onLeaveBack: () => tl.pause(0)
    });
  });
}

// ──────────────────────────────────────────────
// works 필터 (chips → grid FLIP sort) + 상단 고정
// ──────────────────────────────────────────────
function scrollSectionHeadToTop(sectionHead) {
  if (!sectionHead) return;
  const html = document.documentElement;
  const before = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';

  const headerH = ($('header')?.offsetHeight || 64) + 8;
  const y = window.scrollY + sectionHead.getBoundingClientRect().top - headerH;
  window.scrollTo(0, Math.max(0, y));

  requestAnimationFrame(() => { html.style.scrollBehavior = before || ''; });
}

function initFilters() {
  const grid  = $('#cardGrid');
  const chips = $$('.filters .chip');
  if (!grid || !chips.length) return;

  const cards = $$('.card', grid);

  const parseTags = (el) => (el.dataset.tags || '')
    .toLowerCase()
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

  chips.forEach((btn) => {
    btn.addEventListener('click', () => {
      let filter = (btn.dataset.filter || 'all').trim().toLowerCase();
      if (filter === '*' || filter === 'everything') filter = 'all';

      scrollSectionHeadToTop(grid.closest('section')?.querySelector('.section_head'));
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));

      const wasHidden = new Set(cards.filter((c) => c.style.display === 'none'));

      // 인라인 스타일 클린업
      cards.forEach((c) => {
        c.style.display = c.style.opacity = c.style.transform =
        c.style.pointerEvents = c.style.visibility = '';
      });

      void grid.offsetHeight; // 레이아웃 안정화

      const state = Flip.getState(cards);

      const matched   = (filter === 'all') ? cards : cards.filter((c) => parseTags(c).includes(filter));
      const unmatched = cards.filter((c) => !matched.includes(c));

      matched.forEach((c) => grid.appendChild(c));
      unmatched.forEach((c) => grid.appendChild(c));

      const h = grid.offsetHeight;
      gsap.set(grid, { height: h, overflow: 'hidden' });

      const tl = gsap.timeline()
        .add(Flip.from(state, {
          duration: 0.45, ease: 'power1.out', absolute: true, nested: true, stagger: 0.02
        }), 0)
        .to(unmatched, { opacity: 0, scale: 0.96, duration: 0.2, ease: 'power1.out' }, 0)
        .set(unmatched, { display: 'none' }, '>-0.01')
        .to(grid, { height: () => grid.scrollHeight, duration: 0.35, ease: 'power1.out' }, 0.0);

      const toFadeIn = matched.filter((c) => wasHidden.has(c));
      if (toFadeIn.length) {
        gsap.set(toFadeIn, { display: '' });
        tl.fromTo(toFadeIn, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0.12);
      }

      tl.add(() => {
        grid.style.height = '';
        grid.style.overflow = '';
        gsap.set(matched, { clearProps: 'opacity,transform,display,visibility' });
        if (window.ScrollTrigger) {
          (document.fonts?.ready ? document.fonts.ready : Promise.resolve()).then(() => ScrollTrigger.refresh());
        }
      });
    });
  });
}

// ──────────────────────────────────────────────
// Resume Modal (open/close + scroll lock)
// ──────────────────────────────────────────────
const ScrollLock = (() => {
  let y = 0;
  return {
    lock() {
      y = window.scrollY || window.pageYOffset;
      document.documentElement.classList.add('is_modal_open');
      document.body.classList.add('is_modal_open');
      document.body.style.top = `-${y}px`;
    },
    unlock() {
      document.documentElement.classList.remove('is_modal_open');
      document.body.classList.remove('is_modal_open');
      document.body.style.top = '';
      window.scrollTo(0, y);
    }
  };
})();

(function resumeModal() {
  const link = document.querySelector('a[href="#contact"]');
  const dlg  = $('#resumeDialog');
  if (!link || !dlg) return;

  const sheet    = $('.modal_sheet', dlg);
  const btnClose = $('#resumeClose', dlg);

  const openModal = () => {
    (typeof dlg.showModal === 'function') ? dlg.showModal() : dlg.setAttribute('open', '');
    ScrollLock.lock();
    gsap.fromTo(sheet, { yPercent: -4, scale: 0.98, autoAlpha: 0 },
                      { yPercent: 0,  scale: 1.00, autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    setTimeout(() => btnClose?.focus(), 10);
  };

  const closeModal = () => {
    gsap.timeline({
      onComplete: () => { dlg.close?.() || dlg.removeAttribute('open'); ScrollLock.unlock(); }
    }).to(sheet, { yPercent: -4, scale: 0.98, autoAlpha: 0, duration: 0.2, ease: 'power2.in' });
  };

  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    openModal();
  });

  btnClose?.addEventListener('click', closeModal);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });
  dlg.addEventListener('click', (e) => {
    const r = sheet.getBoundingClientRect();
    const inside = (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    if (!inside) closeModal();
  });
})();

// ──────────────────────────────────────────────
// 초기 실행
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 카운터 생성 및 재생
  createCounterDigits();
  animateCounter($('.counter_3'), 2.5);
  animateCounter($('.counter_2'), 3.0);
  animateCounter($('.counter_1'), 2.0, 1.5);

  // 텍스트 리빌 초기 세팅
  prepareHeroTextReveal();

  // 인트로 타임라인
  const tl = gsap.timeline();
  gsap.set('.img', { scale: 0 });
  gsap.set('.btn', { opacity: 0, borderStyle: 'solid', borderWidth: 1, borderColor: 'transparent' });

  tl.to('.hero_bg', { scaleY: '100%', duration: 3, ease: 'power2.inOut', delay: 0.25 })
    .to('.img',     { scale: 1, duration: 1.2, stagger: 0.3, ease: 'power.inOut' }, '<')
    .to('.counter', { opacity: 0, duration: 0.3, ease: 'power3.out', delay: 0.3, onStart: animateImages })
    .to('.hero_bg', { scaleY: '0%', duration: 1, ease: 'power2.inOut', delay: 0.25 })
    .add('copyIn', '>-=0.1')
    .to('.btn', { opacity: 1, borderColor: 'currentColor', duration: 0.6, ease: 'power2.out' }, 'copyIn')
    .to('.reveal', { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'power2.out', stagger: 0.06 }, 'copyIn+=0.05')
    .to('header', { borderBottom: '1px solid var(--line)', duration: 0.6, ease: 'power2.out' }, 'copyIn')
    .to('body',   { overflow: 'auto', duration: 0.6, ease: 'power2.out' }, 'copyIn')
    .to('.img_box', { zIndex: '0', duration: 0.6, ease: 'power2.out' }, 'copyIn');

  const tlHero = setupHeroWordmark();
  tl.add(() => { if (tlHero) tlHero.restart(true); }, 'copyIn+=0.1');

  // 섹션 리빌/필터 초기화
  initMaskReveal();
  initFilters();

  // 폰트/이미지 지연 로딩 대비 ScrollTrigger 리프레시
  const refresh = () => window.ScrollTrigger && ScrollTrigger.refresh();
  (document.fonts?.ready ? document.fonts.ready : Promise.resolve()).then(refresh);
});
