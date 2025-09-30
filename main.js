// ─────────────────────────────────────────────────────────────
// 유틸리티 셀렉터
//  - $  : 단일 요소 선택 (querySelector)
//  - $$ : 다중 요소 선택 배열화 (querySelectorAll -> Array)
// ─────────────────────────────────────────────────────────────
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ─────────────────────────────────────────────────────────────
// 초기 스크롤 위치 제어
//  - bfcache 등으로 복귀했을 때도 항상 맨 위로 시작하도록 강제
//  - history.scrollRestoration='manual'로 브라우저 자동 복원 비활성
// ─────────────────────────────────────────────────────────────
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
addEventListener('load', () => scrollTo(0, 0));
addEventListener('pageshow', e => { if (e.persisted) scrollTo(0, 0); });

// ─────────────────────────────────────────────────────────────
// 동일 페이지 내 앵커 부드러운 스크롤
//  - 헤더 높이만큼 보정하여 앵커가 가려지지 않도록 처리
//  - reduce-motion 환경설정 존중
//  - 해시를 pushState로 갱신(스크롤만 하고 페이지는 그대로)
// ─────────────────────────────────────────────────────────────
(function(){
  const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getHeaderH = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
    const n = parseFloat(v); return Number.isFinite(n) ? n : 0;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;              // 해시 링크만 처리
    const hash = a.getAttribute('href'); if (!hash || hash === '#') return;  // 빈/무의미 해시 제외
    const t = document.getElementById(hash.slice(1)); if (!t) return;        // 타깃 요소 존재 확인
    e.preventDefault();
    const top = scrollY + t.getBoundingClientRect().top - getHeaderH() - 8;  // 헤더 보정 + 여유
    scrollTo({ top, behavior: noMotion ? 'auto' : 'smooth' });
    history.pushState(null, '', hash);                                       // URL 해시 갱신
  });
})();

// ─────────────────────────────────────────────────────────────
// GSAP 플러그인 등록
//  - Flip, SplitText, ScrollTrigger, ScrollTo 사용
// ─────────────────────────────────────────────────────────────
gsap.registerPlugin(Flip, SplitText, ScrollTrigger, ScrollToPlugin);

// ─────────────────────────────────────────────────────────────
// 테마 토글
//  - root[data-theme]와 color-scheme 동기화
//  - localStorage('theme')에 저장
//  - 버튼 접근성 속성(aria-pressed, aria-label) 갱신
// ─────────────────────────────────────────────────────────────
(function(){
  const root = document.documentElement;
  const btn  = $('#btnTheme'); if (!btn) return;
  const label = btn.querySelector('.btn_theme__label');
  const get = () => root.getAttribute('data-theme') || 'light';
  const set = (t) => {
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    localStorage.setItem('theme', t);
    const isDark = t === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    if (label) label.textContent = isDark ? 'dark mode' : 'light mode';
    btn.setAttribute('aria-label', isDark ? 'dark mode' : 'light mode');
  };
  const saved = localStorage.getItem('theme');
  if (saved) root.setAttribute('data-theme', saved); // 초기 적용
  set(get());                                        // 접근성 상태 동기화
  btn.addEventListener('click', () => set(get() === 'light' ? 'dark' : 'light'));
})();

// ─────────────────────────────────────────────────────────────
// 카운터 숫자 DOM 구성
//  - counter_1, _2, _3 컨테이너에 숫자 div들을 추가
//  - 이후 y 이동 애니메이션으로 롤링 효과 구현
// ─────────────────────────────────────────────────────────────
function createCounterDigits(){
  const c1 = $('.counter_1'), c2 = $('.counter_2'), c3 = $('.counter_3');
  if (!c1 || !c2 || !c3) return;
  [['0','num'], ['1','num num1offset1']].forEach(([t, cls]) => {
    const d = document.createElement('div'); d.className=cls; d.textContent=t; c1.appendChild(d);
  });
  for (let i=0;i<=10;i++){
    const d=document.createElement('div'); d.className=i===1?'num num1offset2':'num';
    d.textContent=(i===10)?'0':String(i); c2.appendChild(d);
  }
  for (let i=0;i<30;i++){ const d=document.createElement('div'); d.className='num'; d.textContent=String(i%10); c3.appendChild(d); }
  const last=document.createElement('div'); last.className='num'; last.textContent='0'; c3.appendChild(last);
}
// 카운터 애니메이션: 자식 .num 높이 합만큼 y를 음수로 이동
const animateCounter = (el, dur, delay=0) => {
  if (!el) return;
  const h = el.querySelector('.num')?.clientHeight || 0;
  const total = (el.querySelectorAll('.num').length - 1) * h;
  gsap.to(el, { y:-total, duration:dur, delay, ease:'power2.inOut' });
};

// ─────────────────────────────────────────────────────────────
// 이미지 FLIP 전환 + scale 펀칭
//  - 현재 상태 저장 → 클래스 토글로 레이아웃 변경 → Flip.from으로 부드럽게 재배치
//  - 각 이미지에 scale-in/out 타이밍 겹쳐서 부드러운 확대/복귀
// ─────────────────────────────────────────────────────────────
function animateImages(){
  const imgs = $$('.img'); if (!imgs.length) return gsap.timeline();
  imgs.forEach(i => i.classList.remove('animate_out'));
  const st = Flip.getState(imgs); // 현재 레이아웃 상태 캡처
  imgs.forEach(i => i.classList.add('animate_out')); // 상태 변화 유도
  const tl = gsap.timeline().add(Flip.from(st, { duration:1, stagger:0.1, ease:'power3.inOut' }));
  imgs.forEach((img,i)=>{
    tl.to(img,{ scale:2, duration:0.45, ease:'power3.in'  }, i*0.1+0.025)
      .to(img,{ scale:1, duration:0.45, ease:'power3.out' }, i*0.1+0.5);
  });
  return tl;
}

// ─────────────────────────────────────────────────────────────
// 텍스트 리빌 준비
//  - 대상 텍스트를 <span class="reveal">로 감싸서 yPercent로 등장 제어
//  - 이후 GSAP로 yPercent 125 → 0 전환
// ─────────────────────────────────────────────────────────────
function wrapTextToReveal(sel){
  $$(sel).forEach(el=>{
    if (el.querySelector('.reveal')) return;
    el.innerHTML = `<span class="reveal">${el.textContent}</span>`;
  });
}
function prepareHeroTextReveal(){
  wrapTextToReveal('.logo, .nav_links a, .btn_cta, .hero_footer p, .hero_wordmark, .hero_title .kicker, .hero_title .lede');
  const l = $('#btnTheme .btn_theme__label');
  if (l && !l.classList.contains('reveal')) l.classList.add('reveal');
  gsap.set('.reveal', { yPercent:125, autoAlpha:0 });
}

// ─────────────────────────────────────────────────────────────
// Hero 워드마크 애니메이션
//  - SplitText로 문자 단위 분해 후 위로 튀어나오듯 등장
//  - ScrollTrigger로 hero 진입 시 재생, 벗어나면 초기화
//  - 로고 클릭 시 최상단 스크롤 + 애니메이션 재시작
// ─────────────────────────────────────────────────────────────
function setupHeroWordmark(){
  const el = $('.hero_wordmark'); if (!el) return null;
  const split = new SplitText(el, { type:'chars' });
  const reset = () => gsap.set(split.chars, { y:20, autoAlpha:0 });
  reset();
  const tl = gsap.timeline({ paused:true }).to(split.chars, { y:-50, autoAlpha:1, duration:0.8, ease:'power2.out', stagger:0.12 });
  const st = ScrollTrigger.create({
    trigger: '.hero', start: 'top 10%',
    onEnter:()=>tl.restart(true), onEnterBack:()=>tl.restart(true),
    onLeave:()=>{ tl.pause(0); reset(); }, onLeaveBack:()=>{ tl.pause(0); reset(); }
  });
  if (st.isActive || scrollY===0) requestAnimationFrame(()=>tl.restart(true));
  const logo = document.querySelector('.logo[href="#top"]') || $('.logo');
  logo?.addEventListener('click', e=>{
    e.preventDefault();
    gsap.to(window, { duration:0.2, scrollTo:0, onComplete:()=>{ reset(); tl.restart(true);} });
  });
  return tl;
}

// ─────────────────────────────────────────────────────────────
// 섹션 진입 마스크 리빌
//  - clip-path inset을 이용해 오른쪽→왼쪽 순차 개방
//  - 스크롤 트리거로 보일 때마다 재생, 벗어나면 초기화
// ─────────────────────────────────────────────────────────────
function initMaskReveal(){
  if (!window.gsap || !window.ScrollTrigger) return;
  $$('.mask_reveal').forEach(el=>{
    const tl = gsap.timeline({ paused:true })
      .fromTo(el, { clipPath:'inset(0 100% 0 0)' }, { clipPath:'inset(0 0% 0 0)', duration:0.8, ease:'power3.out' })
      .fromTo(el, { yPercent:20, opacity:0 }, { yPercent:0, opacity:1, duration:0.8, ease:'power3.out' }, 0);
    ScrollTrigger.create({
      trigger: el, start: 'top 80%',
      onEnter:()=>tl.restart(true), onEnterBack:()=>tl.restart(true),
      onLeave:()=>tl.pause(0), onLeaveBack:()=>tl.pause(0)
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Works 필터 + 상단 고정
//  - 필터 클릭 시 섹션 헤드가 상단에 오도록 즉시 스크롤
//  - Flip으로 카드 재배치 전/후 상태 전환
//  - 매칭 안 된 카드는 opacity/scale 후 display:none
//  - 폰트 로딩 완료 후 ScrollTrigger.refresh로 레이아웃 재계산
// ─────────────────────────────────────────────────────────────
function scrollSectionHeadToTop(head){
  if (!head) return;
  const html = document.documentElement, prev = html.style.scrollBehavior;
  html.style.scrollBehavior='auto';
  const headerH = ($('header')?.offsetHeight || 64) + 8;
  const y = scrollY + head.getBoundingClientRect().top - headerH;
  scrollTo(0, Math.max(0,y));
  requestAnimationFrame(()=>{ html.style.scrollBehavior = prev || ''; });
}
function initFilters(){
  const grid = $('#cardGrid'), chips = $$('.filters .chip');
  if (!grid || !chips.length) return;
  const cards = $$('.card', grid);
  const tags = el => (el.dataset.tags||'').toLowerCase().split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);

  chips.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      let f = (btn.dataset.filter||'all').trim().toLowerCase();
      if (f==='*' || f==='everything') f='all';
      scrollSectionHeadToTop(grid.closest('section')?.querySelector('.section_head')); // 상단 고정

      chips.forEach(c=>c.setAttribute('aria-pressed', String(c===btn))); // 접근성 상태

      const wasHidden = new Set(cards.filter(c=>c.style.display==='none')); // 이전에 숨겨졌던 카드 기록

      // 모든 카드 인라인 스타일 초기화
      cards.forEach(c=>{ c.style.display=c.style.opacity=c.style.transform=c.style.pointerEvents=c.style.visibility=''; });
      void grid.offsetHeight; // 리플로우 강제하여 Flip 상태 정확화

      const state = Flip.getState(cards); // 현재 위치/크기 캡처
      const matched = (f==='all') ? cards : cards.filter(c=>tags(c).includes(f));
      const unmatched = cards.filter(c=>!matched.includes(c));

      // DOM 순서를 matched → unmatched 순으로 재배치(레이아웃 변화 유도)
      matched.forEach(c=>grid.appendChild(c));
      unmatched.forEach(c=>grid.appendChild(c));

      // 높이 전환 애니메이션을 위해 일시적으로 고정
      const h = grid.offsetHeight;
      gsap.set(grid, { height:h, overflow:'hidden' });

      const tl = gsap.timeline()
        .add(Flip.from(state, { duration:0.45, ease:'power1.out', absolute:true, nested:true, stagger:0.02 }), 0)
        .to(unmatched, { opacity:0, scale:0.96, duration:0.2, ease:'power1.out' }, 0)
        .set(unmatched, { display:'none' }, '>-0.01')
        .to(grid, { height:()=>grid.scrollHeight, duration:0.35, ease:'power1.out' }, 0.0);

      // 이전에 숨겨졌던 카드가 이번에 노출되면 살짝 페이드인
      const toIn = matched.filter(c=>wasHidden.has(c));
      if (toIn.length){ gsap.set(toIn,{display:''}); tl.fromTo(toIn,{opacity:0},{opacity:1,duration:0.2,ease:'power1.out'},0.12); }

      // 마무리 클린업
      tl.add(()=>{
        grid.style.height=''; grid.style.overflow='';
        gsap.set(matched, { clearProps:'opacity,transform,display,visibility' });
        if (window.ScrollTrigger){
          (document.fonts?.ready ? document.fonts.ready : Promise.resolve()).then(()=>ScrollTrigger.refresh());
        }
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Resume 모달용 스크롤 락(바디 고정)
//  - 열릴 때 현재 스크롤Y 저장 후 body에 top 음수 적용
//  - 닫을 때 복원
// ─────────────────────────────────────────────────────────────
const ScrollLock = (() => {
  let y = 0;
  return {
    lock(){
      y = scrollY || pageYOffset;
      document.documentElement.classList.add('is_modal_open');
      document.body.classList.add('is_modal_open');
      document.body.style.top = `-${y}px`;
    },
    unlock(){
      document.documentElement.classList.remove('is_modal_open');
      document.body.classList.remove('is_modal_open');
      document.body.style.top = '';
      scrollTo(0, y);
    }
  };
})();

// ─────────────────────────────────────────────────────────────
// Resume 모달 열기/닫기 동작
//  - <a href="#contact"> 클릭 시 모달 오픈
//  - dialog API 지원 시 showModal, 미지원 시 open 속성 강제
//  - 시트 밖 클릭/ESC(cancel) 시 닫힘
//  - 열릴 때 스크롤 락 + 살짝 튀어나오는 애니메이션
// ─────────────────────────────────────────────────────────────
(function(){
  const link = document.querySelector('a[href="#contact"]');
  const dlg  = $('#resumeDialog'); if (!link || !dlg) return;
  const sheet = $('.modal_sheet', dlg);
  const btnX  = $('#resumeClose', dlg);

  const open = () => {
    dlg.showModal?.() ?? dlg.setAttribute('open','');
    ScrollLock.lock();
    gsap.fromTo(sheet, { yPercent:-4, scale:0.98, autoAlpha:0 }, { yPercent:0, scale:1, autoAlpha:1, duration:0.35, ease:'power2.out' });
    setTimeout(()=>btnX?.focus(),10); // 접근성: 닫기 버튼 포커스
  };
  const close = () => {
    gsap.to(sheet, { yPercent:-4, scale:0.98, autoAlpha:0, duration:0.2, ease:'power2.in',
      onComplete:()=>{ dlg.close?.() || dlg.removeAttribute('open'); ScrollLock.unlock(); }
    });
  };

  link.addEventListener('click', e=>{ e.preventDefault(); open(); });
  btnX?.addEventListener('click', close);
  dlg.addEventListener('cancel', e=>{ e.preventDefault(); close(); }); // ESC
  dlg.addEventListener('click', e=>{
    const r = sheet.getBoundingClientRect();
    const inside = (e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom);
    if (!inside) close(); // 시트 외부 클릭으로 닫기
  });
})();

// ─────────────────────────────────────────────────────────────
// 초기 실행 시퀀스
//  - 카운터 DOM 생성 및 롤링 애니메이션
//  - Hero 텍스트 리빌 준비 및 배경/이미지/카피 등장 타임라인
//  - Hero 워드마크 개별 타이밍 재생
//  - 섹션 마스크 리빌, 필터 초기화
//  - 폰트 로딩 이후 ScrollTrigger.refresh로 레이아웃 안정화
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  createCounterDigits();
  animateCounter($('.counter_3'), 2.5);
  animateCounter($('.counter_2'), 3.0);
  animateCounter($('.counter_1'), 2.0, 1.5);

  prepareHeroTextReveal();

  const tl = gsap.timeline();
  gsap.set('.img', { scale:0 });
  gsap.set('.btn', { opacity:0, borderStyle:'solid', borderWidth:1, borderColor:'transparent' });

  tl.to('.hero_bg', { scaleY:'100%', duration:3, ease:'power2.inOut', delay:0.25 })                    // 배경 세로 확장
    .to('.img',     { scale:1, duration:1.2, stagger:0.3, ease:'power.inOut' }, '<')                    // 이미지 등장
    .to('.counter', { opacity:0, duration:0.3, ease:'power3.out', delay:0.3, onStart:animateImages })   // 카운터 페이드아웃 + 이미지 Flip
    .to('.hero_bg', { scaleY:'0%', duration:1, ease:'power2.inOut', delay:0.25 })                       // 배경 수축
    .add('copyIn', '>-=0.1')
    .to('.btn', { opacity:1, borderColor:'currentColor', duration:0.6, ease:'power2.out' }, 'copyIn')   // 버튼 테두리 표시
    .to('.reveal', { yPercent:0, autoAlpha:1, duration:0.8, ease:'power2.out', stagger:0.06 }, 'copyIn+=0.05') // 텍스트 리빌
    .to('header', { borderBottom:'1px solid var(--line)', duration:0.6, ease:'power2.out' }, 'copyIn')  // 헤더 보더 표시
    .to('body',   { overflow:'auto', duration:0.6, ease:'power2.out' }, 'copyIn')                       // 스크롤 허용
    .to('.img_box',{ zIndex:'0', duration:0.6, ease:'power2.out' }, 'copyIn');                          // 쌓임순서 복구

  const tlHero = setupHeroWordmark();
  tl.add(()=>{ if (tlHero) tlHero.restart(true); }, 'copyIn+=0.1');

  initMaskReveal();
  initFilters();

  const refresh = () => window.ScrollTrigger && ScrollTrigger.refresh();
  (document.fonts?.ready ? document.fonts.ready : Promise.resolve()).then(refresh);
});
