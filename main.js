/* ---------- 유틸 ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

/* ---------- 스크롤 초기화 ---------- */
if (history.scrollRestoration) history.scrollRestoration = 'manual';
addEventListener('load', ()=>scrollTo(0,0));
addEventListener('pageshow', e=>{ if(e.persisted) scrollTo(0,0); });

/* ---------- 앵커 스크롤 ---------- */
document.addEventListener('click', e=>{
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute('href');
  const t = $(hash);
  if (!t) return e.preventDefault();
  e.preventDefault();
  const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))||0;
  const top = t.getBoundingClientRect().top + scrollY - h - 8;
  scrollTo({ top, behavior:'smooth' });
  history.pushState(null,'',hash);
});

/* ---------- GSAP ---------- */
gsap.registerPlugin(Flip, SplitText, ScrollTrigger, ScrollToPlugin);

/* ---------- 테마 ---------- */
(function(){
  const root=document.documentElement, btn=$('#btnTheme');
  if(!btn) return;
  const saved = localStorage.getItem('theme');
  if(saved) root.dataset.theme=saved;
  const set = t=>{
    root.dataset.theme=t;
    root.style.colorScheme=t;
    localStorage.setItem('theme',t);
  }
  btn.addEventListener('click', ()=>{
    set(root.dataset.theme==='light'?'dark':'light');
  });
})();

/* ---------- 카운터 DOM ---------- */
function createCounterDigits(){
  const c1=$('.counter_1'),c2=$('.counter_2'),c3=$('.counter_3');
  if(!c1||!c2||!c3) return;

  // counter 1
  [['0','num'],['1','num num1offset1']].forEach(([t,c])=>{
    const d=document.createElement('div'); d.className=c; d.textContent=t; c1.appendChild(d);
  });

  // counter 2
  for(let i=0;i<=10;i++){
    const d=document.createElement('div');
    d.className = i===1?'num num1offset2':'num';
    d.textContent = i===10?'0':String(i);
    c2.appendChild(d);
  }

  // counter 3
  for(let i=0;i<30;i++){
    const d=document.createElement('div');
    d.className='num'; d.textContent=String(i%10);
    c3.appendChild(d);
  }
  const last=document.createElement('div'); last.className='num'; last.textContent='0';
  c3.appendChild(last);
}

/* ---------- 카운터 애니메이션 ---------- */
function animateCounter(el,dur,delay=0){
  if(!el) return;
  const h = el.querySelector('.num')?.clientHeight||0;
  const total = (el.querySelectorAll('.num').length-1)*h;
  gsap.to(el,{y:-total,duration:dur,delay,ease:'power2.inOut'});
}

/* ---------- 이미지 Flip + scale ---------- */
function animateImages(){
  const imgs = $$('.img'); if(!imgs.length) return;
  imgs.forEach(i=>i.classList.remove('animate_out'));
  const st = Flip.getState(imgs);
  imgs.forEach(i=>i.classList.add('animate_out'));
  const tl = gsap.timeline().add(Flip.from(st,{duration:1,stagger:0.1,ease:'power3.inOut'}));
  imgs.forEach((img,i)=>{
    tl.to(img,{scale:2,duration:0.45,ease:'power3.in'}, i*0.1+0.02)
      .to(img,{scale:1,duration:0.45,ease:'power3.out'}, i*0.1+0.5);
  });
}

/* ---------- 텍스트 리빌 ---------- */
function wrapText(sel){
  $$(sel).forEach(el=>{
    if(!el.querySelector('.reveal'))
      el.innerHTML = `<span class="reveal">${el.textContent}</span>`;
  });
}
function prepareHeroTextReveal(){
  wrapText('.logo, .nav_links a, .btn_cta, .hero_footer p, .hero_wordmark, .hero_title .kicker, .hero_title .lede');
  const l=$('#btnTheme .btn_theme__label');
  if(l && !l.classList.contains('reveal')) l.classList.add('reveal');
  gsap.set('.reveal',{yPercent:125,autoAlpha:0});
}

/* ---------- Hero 워드마크 ---------- */
function setupHeroWordmark(){
  const el=$('.hero_wordmark'); if(!el) return;
  const split=new SplitText(el,{type:'chars'});
  const reset=()=>gsap.set(split.chars,{y:20,autoAlpha:0});
  reset();
  const tl=gsap.timeline({paused:true}).to(split.chars,{
    y:-50,autoAlpha:1,duration:0.8,ease:'power2.out',stagger:0.12
  });
  const st=ScrollTrigger.create({
    trigger:'.hero',start:'top 10%',
    onEnter:()=>tl.restart(true),
    onEnterBack:()=>tl.restart(true),
    onLeave:()=>{tl.pause(0);reset();},
    onLeaveBack:()=>{tl.pause(0);reset();}
  });
  if(st.isActive||scrollY===0) requestAnimationFrame(()=>tl.restart(true));
  const logo=$('.logo[href="#top"]')||$('.logo');
  logo?.addEventListener('click',e=>{
    e.preventDefault();
    gsap.to(window,{duration:0.2,scrollTo:0,onComplete:()=>{reset();tl.restart(true);}});
  });
}

/* ---------- Mask Reveal ---------- */
function initMaskReveal(){
  $$('.mask_reveal').forEach(el=>{
    const tl = gsap.timeline({paused:true})
      .fromTo(el,{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:0.8,ease:'power3.out'})
      .fromTo(el,{yPercent:20,opacity:0},{yPercent:0,opacity:1,duration:0.8,ease:'power3.out'},0);

    ScrollTrigger.create({
      trigger:el,start:'top 80%',
      onEnter:()=>tl.restart(true),
      onEnterBack:()=>tl.restart(true),
      onLeave:()=>tl.pause(0),
      onLeaveBack:()=>tl.pause(0)
    });
  });
}

/* ---------- Works 필터 ---------- */
function scrollSectionHeadToTop(head){
  if(!head) return;
  const html=document.documentElement;
  const prev=html.style.scrollBehavior;
  html.style.scrollBehavior='auto';
  const headerH=($('header')?.offsetHeight||64)+8;
  const y = scrollY + head.getBoundingClientRect().top - headerH;
  scrollTo(0,Math.max(0,y));
  requestAnimationFrame(()=>{html.style.scrollBehavior=prev||'';});
}

function initFilters(){
  const grid=$('#cardGrid'), chips=$$('.filters .chip');
  if(!grid||!chips.length) return;
  const cards=$$('.card',grid);
  const tags=el=>(el.dataset.tags||'').toLowerCase().split(/[,\s]+/).filter(Boolean);

  chips.forEach(btn=>{
    btn.addEventListener('click',()=>{
      let f=(btn.dataset.filter||'all').trim().toLowerCase();
      if(f==='*'||f==='everything') f='all';

      scrollSectionHeadToTop(grid.closest('section')?.querySelector('.section_head'));
      chips.forEach(c=>c.setAttribute('aria-pressed',String(c===btn)));

      const wasHidden=new Set(cards.filter(c=>c.style.display==='none'));
      cards.forEach(c=>{c.style.display=c.style.opacity=c.style.transform=c.style.pointerEvents=c.style.visibility='';});
      void grid.offsetHeight;

      const state=Flip.getState(cards);
      const matched=f==='all'?cards:cards.filter(c=>tags(c).includes(f));
      const unmatched=cards.filter(c=>!matched.includes(c));

      matched.forEach(c=>grid.appendChild(c));
      unmatched.forEach(c=>grid.appendChild(c));

      const h=grid.offsetHeight;
      gsap.set(grid,{height:h,overflow:'hidden'});

      const tl=gsap.timeline()
        .add(Flip.from(state,{duration:0.45,ease:'power1.out',absolute:true,nested:true,stagger:0.02}),0)
        .to(unmatched,{opacity:0,scale:0.96,duration:0.2,ease:'power1.out'},0)
        .set(unmatched,{display:'none'},'>-0.01')
        .to(grid,{height:()=>grid.scrollHeight,duration:0.35,ease:'power1.out'},0);

      const toIn=matched.filter(c=>wasHidden.has(c));
      if(toIn.length){
        gsap.set(toIn,{display:''});
        tl.fromTo(toIn,{opacity:0},{opacity:1,duration:0.2,ease:'power1.out'},0.12);
      }

      tl.add(()=>{
        grid.style.height='';grid.style.overflow='';
        gsap.set(matched,{clearProps:'opacity,transform,display,visibility'});
        (document.fonts?.ready?document.fonts.ready:Promise.resolve())
          .then(()=>ScrollTrigger.refresh());
      });
    });
  });
}

/* ---------- ScrollLock ---------- */
const ScrollLock=(()=>{
  let y=0;
  return{
    lock(){
      y=scrollY;
      document.documentElement.classList.add('is_modal_open');
      document.body.classList.add('is_modal_open');
      document.body.style.top=`-${y}px`;
    },
    unlock(){
      document.documentElement.classList.remove('is_modal_open');
      document.body.classList.remove('is_modal_open');
      document.body.style.top='';
      scrollTo(0,y);
    }
  };
})();

/* ---------- 모달 ---------- */
(function(){
  const link=$('a[href="#contact"]');
  const dlg=$('#resumeDialog');
  if(!link||!dlg) return;
  const sheet=$('.modal_sheet',dlg);
  const btnX=$('#resumeClose',dlg);

  const open=()=>{
    dlg.showModal?.()??dlg.setAttribute('open','');
    ScrollLock.lock();
    gsap.fromTo(sheet,{yPercent:-4,scale:0.98,autoAlpha:0},{
      yPercent:0,scale:1,autoAlpha:1,duration:0.35,ease:'power2.out'
    });
    setTimeout(()=>btnX?.focus(),10);
  };

  const close=()=>{
    gsap.to(sheet,{
      yPercent:-4,scale:0.98,autoAlpha:0,duration:0.2,ease:'power2.in',
      onComplete:()=>{dlg.close?.()||dlg.removeAttribute('open');ScrollLock.unlock();}
    });
  };

  link.addEventListener('click',e=>{e.preventDefault();open();});
  btnX?.addEventListener('click',close);
  dlg.addEventListener('cancel',e=>{e.preventDefault();close();});
  dlg.addEventListener('click',e=>{
    const r=sheet.getBoundingClientRect();
    const inside=(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
    if(!inside) close();
  });
})();

/* ---------- 초기 실행 ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  createCounterDigits();
  animateCounter($('.counter_3'),2.5);
  animateCounter($('.counter_2'),3.0);
  animateCounter($('.counter_1'),2.0,1.5);

  prepareHeroTextReveal();

  gsap.set('.img',{scale:0});
  gsap.set('.btn',{opacity:0,borderStyle:'solid',borderWidth:1,borderColor:'transparent'});

  const tl=gsap.timeline();
  tl.to('.hero_bg',{scaleY:'100%',duration:3,ease:'power2.inOut',delay:0.25})
    .to('.img',{scale:1,duration:1.2,stagger:0.3,ease:'power.inOut'},'<')
    .to('.counter',{opacity:0,duration:0.3,ease:'power3.out',delay:0.3,onStart:animateImages})
    .to('.hero_bg',{scaleY:'0%',duration:1,ease:'power2.inOut',delay:0.25})
    .add('copyIn','>-=0.1')
    .to('.btn',{opacity:1,borderColor:'currentColor',duration:0.6,ease:'power2.out'},'copyIn')
    .to('.reveal',{yPercent:0,autoAlpha:1,duration:0.8,ease:'power2.out',stagger:0.06},'copyIn+=0.05')
    .to('header',{borderBottom:'1px solid var(--line)',duration:0.6,ease:'power2.out'},'copyIn')
    .to('body',{overflow:'auto',duration:0.6,ease:'power2.out'},'copyIn')
    .to('.img_box',{zIndex:'0',duration:0.6,ease:'power2.out'},'copyIn');

  const tlHero=setupHeroWordmark();
  tl.add(()=>{if(tlHero) tlHero.restart(true);},'copyIn+=0.1');

  initMaskReveal();
  initFilters();

  const refresh=()=>ScrollTrigger.refresh();
  (document.fonts?.ready?document.fonts.ready:Promise.resolve()).then(refresh);
});
