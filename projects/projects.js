import slides from "./slides.js";
gsap.registerPlugin(SplitText);

document.addEventListener("DOMContentLoaded", () => {
  // ─────────────────────────────────────────────
  // 유틸
  //  - $  : 단일 요소 선택
  //  - $$ : 다중 요소 선택 → 배열
  //  - toAbs: 상대/루트 경로를 절대 URL로 변환
  // ─────────────────────────────────────────────
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const toAbs = (p) => (p ? new URL(p, document.baseURI).href : "");

  // ─────────────────────────────────────────────
  // 시작 인덱스 계산
  //  - ?project=슬러그 → 우선 매치
  //  - 슬러그가 modalImg 경로나 제목에 포함되면 보조 매치
  //  - ?slide=번호(1~total) 허용
  //  - 모두 실패 시 1번
  // ─────────────────────────────────────────────
  function getStartIndex(total){
    const q = new URLSearchParams(location.search);
    const slug = q.get("project");
    const num  = Number(q.get("slide"));
    if (slug){
      const i1 = slides.findIndex(s => (s.slug||"") === slug);
      if (i1 !== -1) return i1 + 1;
      const i2 = slides.findIndex(s =>
        (s.modalImg||"").includes(slug) ||
        (s.slideTitle||"").toLowerCase().includes(slug.toLowerCase())
      );
      if (i2 !== -1) return i2 + 1;
    }
    if (Number.isInteger(num) && num>=1 && num<=total) return num;
    return 1;
  }

  // ─────────────────────────────────────────────
  // 상태 변수
  //  - cur  : 현재 슬라이드(1-based)
  //  - busy : 전환 중 잠금
  //  - ok   : 입력 허용 플래그
  //  - last : 마지막 입력 처리 시각(ms)
  //  - modal: 모달 열림 여부(입력 차단용)
  // ─────────────────────────────────────────────
  const total = slides.length;
  let cur   = getStartIndex(total);
  let busy  = false;
  let ok    = true;
  let last  = 0;
  let modal = false;

  // ─────────────────────────────────────────────
  // 비디오 제어
  //  - 모든 비디오 일시정지
  //  - 활성 슬라이드 비디오만 음소거 재생 시도
  // ─────────────────────────────────────────────
  const pauseAll = () => $$('video').forEach(v=>{ try{ v.pause(); }catch{} });
  const playActive = () => {
    const v = $('.slide.is-active video');
    if (v) { v.muted = true; v.play().catch(()=>{}); }
  };

  // ─────────────────────────────────────────────
  // ScrollLock
  //  - body를 fixed로 고정하여 배경 스크롤 방지
  //  - 스크롤바 폭만큼 padding-right 보정
  //  - 해제 시 원위치
  // ─────────────────────────────────────────────
  const ScrollLock = (() => {
    let y = 0, pr = "";
    return {
      lock(){
        y = window.scrollY;
        const de = document.documentElement, b = document.body;
        const sbw = window.innerWidth - de.clientWidth;
        pr = b.style.paddingRight || "";
        b.style.paddingRight = sbw>0 ? `${sbw}px` : "";
        b.classList.add("is_modal_open"); de.classList.add("is_modal_open");
        b.style.position="fixed"; b.style.top=`-${y}px`; b.style.left="0"; b.style.right="0"; b.style.width="100%";
        b.style.transform="translateZ(0)";
      },
      unlock(){
        const de = document.documentElement, b = document.body;
        b.classList.remove("is_modal_open"); de.classList.remove("is_modal_open");
        b.style.position=b.style.top=b.style.left=b.style.right=b.style.width=b.style.transform="";
        b.style.paddingRight = pr;
        window.scrollTo(0, y);
      }
    };
  })();

  // ─────────────────────────────────────────────
  // 파일 다운로드(이력서 버튼용)
  //  - fetch → blob → objectURL → a.download 트리거
  // ─────────────────────────────────────────────
  async function downloadFile(url, fn="download"){
    const r = await fetch(url, { cache:"no-store" });
    if (!r.ok) throw new Error();
    const blob = await r.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=u; a.download=fn; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(u);
  }

  // ─────────────────────────────────────────────
  // 슬라이드 DOM 생성
  //  - 비디오 엘리먼트 + 에러 시 이미지 폴백
  //  - 텍스트/태그/인덱스 정보 구성
  // ─────────────────────────────────────────────
  function createSlide(i){
    const d = slides[i-1];
    const slide = document.createElement("div");
    slide.className = "slide";

    // 영상 영역
    const wrap = document.createElement("div");
    wrap.className = "slide_video";
    const v = document.createElement("video");
    v.className = "slide_video_el";
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute("muted",""); v.setAttribute("autoplay",""); v.setAttribute("playsinline",""); v.setAttribute("webkit-playsinline","");
    v.preload = "metadata";
    v.src = toAbs(d.slideVideo);
    wrap.appendChild(v);

    // 비디오 로드 실패 시 이미지로 교체
    v.addEventListener("error", () => {
      const img = new Image();
      img.alt = d.slideTitle || "project image";
      img.decoding="async"; img.loading="eager";
      img.src = toAbs(d.modalImg || "img/fallback.jpg");
      v.replaceWith(img);
    });
    // 사용자 상호작용 또는 가시 상태에서 재생 시도
    requestAnimationFrame(() => {
      const play = () => v.play().catch(()=>{});
      if (document.visibilityState === "visible") play();
      window.addEventListener("pointerdown", play, { once:true });
    });

    // 텍스트 블록
    const header = document.createElement("div");
    header.className = "slide_header";

    const t = document.createElement("div"); t.className="slide_title";
    const h1=document.createElement("h1"); h1.textContent=d.slideTitle; t.appendChild(h1);

    const desc=document.createElement("div"); desc.className="slide_description";
    const p=document.createElement("p"); p.textContent=d.slideDescription; desc.appendChild(p);

    const link=document.createElement("div"); link.className="slide_link";
    const a=document.createElement("a"); a.textContent="View Project"; a.href="#"; a.dataset.idx=String(i-1);
    link.appendChild(a);
    header.append(t, desc, link);

    // 인덱스/태그
    const info=document.createElement("div"); info.className="slide_info";
    const idxWrap=document.createElement("div"); idxWrap.className="index_wrapper";
    const idx=document.createElement("p"); idx.textContent=String(i).padStart(2,"0");
    const sep=document.createElement("p"); sep.textContent="/";
    const tot=document.createElement("p"); tot.textContent=String(total).padStart(2,"0");
    idxWrap.append(idx, sep, tot);
    const tags=document.createElement("div"); tags.className="slide_tags";
    const lab=document.createElement("p"); lab.textContent="Tags"; tags.appendChild(lab);
    (d.slideTags||[]).forEach(s=>{ const tp=document.createElement("p"); tp.textContent=s; tags.appendChild(tp); });
    info.append(idxWrap, tags);

    slide.append(wrap, header, info);
    return slide;
  }

  // ─────────────────────────────────────────────
  // SplitText 적용
  //  - 제목: 단어 단위
  //  - 설명/링크/태그/인덱스: 줄 단위
  // ─────────────────────────────────────────────
  function splitText(slide){
    const h1 = slide.querySelector(".slide_title h1");
    if (h1) SplitText.create(h1, { type:"words", wordsClass:"word", mask:"words" });
    $$(".slide_description p, .slide_link a, .slide_tags p, .index_wrapper p", slide)
      .forEach(el => SplitText.create(el, { type:"lines", linesClass:"line", mask:"lines", reduceWhiteSpace:false }));
  }

  // ─────────────────────────────────────────────
  // 첫 마운트
  //  - 기존 슬라이드 제거 후 현재 인덱스 슬라이드 렌더
  //  - SplitText 초기세팅 + 활성 비디오 재생
  // ─────────────────────────────────────────────
  function mountFirst(){
    const root = $(".slider"); if (!root) return;
    root.querySelectorAll(":scope > .slide").forEach(el=>el.remove());
    const s = createSlide(cur);
    s.classList.add("is-active");
    root.appendChild(s);
    splitText(s);
    gsap.set(s.querySelectorAll(".word, .line"), { y:"0%", clearProps:"transform" });
    playActive();
  }

  // ─────────────────────────────────────────────
  // 전환(go)
  //  - dir: "down" 다음 슬라이드, "up" 이전 슬라이드(순환)
  //  - 현재 슬라이드 축소/회전/이탈
  //  - 다음 슬라이드 클립/진입 + 텍스트 시퀀스
  //  - 완료 시 입력 해제, 비디오 재생
  // ─────────────────────────────────────────────
  function go(dir){
    if (busy || !ok) return;
    busy = true; ok = false;

    const root = $(".slider");
    const curEl = root.querySelector(".slide.is-active");
    cur = (dir==="down") ? (cur===total?1:cur+1) : (cur===1?total:cur-1);

    pauseAll();

    const exitY  = dir==="down" ? "-200vh" : "200vh";
    const entryY = dir==="down" ? "100vh"  : "-100vh";
    const clipIn = dir==="down" ? "polygon(20% 20%,80% 20%,80% 100%,20% 100%)"
                                : "polygon(20% 0%,80% 0%,80% 80%,20% 80%)";

    gsap.to(curEl, {
      scale:0.25, opacity:0, rotation:30, y:exitY, duration:2, ease:"power4.inOut", force3D:true,
      onComplete: () => curEl.remove()
    });
    curEl.classList.remove("is-active");

    setTimeout(() => {
      const next = createSlide(cur);
      next.classList.add("is-active");
      gsap.set(next, { y:entryY, clipPath:clipIn, force3D:true });
      root.appendChild(next);

      splitText(next);
      const els = next.querySelectorAll(".word, .line");
      gsap.set(els, { y:"100%", force3D:true });

      gsap.to(next, {
        y:0, clipPath:"polygon(0% 0%,100% 0%,100% 100%,0% 100%)",
        duration:1.5, ease:"power4.out", force3D:true,
        onStart: () => {
          const tl = gsap.timeline();
          tl.to(next.querySelectorAll(".slide_title .word"), { y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, 0.75)
            .to(next.querySelectorAll(".slide_tags .line"),  { y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, "-=0.75")
            .to(next.querySelectorAll(".index_wrapper .line"),{ y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, "<")
            .to(next.querySelectorAll(".slide_description .line"),{ y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, "<")
            .to(next.querySelectorAll(".slide_link .line"),   { y:"0%", duration:1, ease:"power4.out" }, "-=1");
        },
        onComplete: () => {
          playActive();
          busy = false;
          setTimeout(() => { ok = true; last = Date.now(); }, 100);
        }
      });
    }, 750);
  }

  // ─────────────────────────────────────────────
  // 입력 처리(step)
  //  - 연타 방지 쿨다운(1초)
  //  - busy/ok 플래그 점검 후 go 호출
  // ─────────────────────────────────────────────
  function step(dir){
    const now = Date.now();
    if (busy || !ok) return;
    if (now - last < 1000) return;
    last = now; go(dir);
  }
  // 휠 입력
  window.addEventListener("wheel", (e) => {
    if (modal) return;
    e.preventDefault();
    step(e.deltaY > 0 ? "down" : "up");
  }, { passive:false });

  // 터치 스와이프 입력
  let y0 = 0, touching = false;
  window.addEventListener("touchstart", (e) => { if (modal) return; y0 = e.touches[0].clientY; touching = true; }, { passive:false });
  window.addEventListener("touchmove",  (e) => {
    if (modal) return;
    e.preventDefault();
    if (!touching || busy || !ok) return;
    const dy = y0 - e.touches[0].clientY;
    if (Math.abs(dy) > 50){ touching = false; step(dy>0 ? "down" : "up"); }
  }, { passive:false });
  window.addEventListener("touchend",   () => { touching = false; });

  // ─────────────────────────────────────────────
  // 초기 렌더
  // ─────────────────────────────────────────────
  mountFirst();

  // ─────────────────────────────────────────────
  // bfcache 복귀 시 초기화
  // ─────────────────────────────────────────────
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) { cur = getStartIndex(total); mountFirst(); last = Date.now(); }
  });

  // ─────────────────────────────────────────────
  // 이력서 모달(기능 유지)
  //  - 열기: 배경 재생 중지, ScrollLock, 포커스 이동
  //  - 닫기: ScrollLock 해제, 상태 복구, 비디오 재생
  //  - 다운로드: fetch 실패 시 새 탭 백업
  // ─────────────────────────────────────────────
  (function resumeModal(){
    const link = document.querySelector('a[href="#contact"]');
    const dlg  = $("#resumeDialog");
    if (!link || !dlg) return;
    const sheet = $(".modal_sheet", dlg);
    const btnX  = $("#resumeClose", dlg);
    const btnDL = $("#resumeDownload", dlg);

    const open = () => {
      modal = true; ok = false; pauseAll();
      dlg.showModal?.() ?? dlg.setAttribute("open","");
      ScrollLock.lock();
      $(".slider")?.classList.add("pe-none");
      gsap.fromTo(sheet, { yPercent:-4, scale:0.98, autoAlpha:0 }, { yPercent:0, scale:1, autoAlpha:1, duration:0.35, ease:"power2.out",
        onComplete: ()=> setTimeout(()=>btnX?.focus(),10)
      });
    };
    const close = () => {
      gsap.to(sheet, { yPercent:-4, scale:0.98, autoAlpha:0, duration:0.2, ease:"power2.in",
        onComplete: ()=>{
          dlg.close?.() || dlg.removeAttribute("open");
          ScrollLock.unlock();
          modal = false; last = Date.now();
          setTimeout(()=>{ ok = true; }, 100);
          $(".slider")?.classList.remove("pe-none");
          playActive();
        }
      });
    };

    link.addEventListener("click", e => { e.preventDefault(); open(); });
    btnX?.addEventListener("click", close);
    dlg.addEventListener("cancel", e => { e.preventDefault(); close(); });
    dlg.addEventListener("click", e => {
      const r = sheet.getBoundingClientRect();
      const inside = (e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom);
      if (!inside) close();
    });
    btnDL?.addEventListener("click", async e => {
      e.preventDefault();
      const href = toAbs("/img/resume.png");
      try { await downloadFile(href, "resume.png"); } catch { window.open(href, "_blank", "noopener"); }
    });
  })();

  // ─────────────────────────────────────────────
  // 프로젝트 모달(간결판)
  //  - 썸네일 선표시 → 원본 프리로드 후 같은 노드로 스왑
  //  - 다운로드 링크 href/download 속성 세팅
  //  - 슬라이드 내 "View Project" 클릭을 위임 처리
  // ─────────────────────────────────────────────
  (function projectModal(){
    const dlg = $("#projectDialog");
    if (!dlg) return;
    const sheet = $(".modal_sheet", dlg);
    const btnX  = $("#resumeClose", dlg);
    const btnDL = $("#resumeDownload", dlg);
    const title = $("#resumeTitle", dlg);
    const host  = $(".modal_body", dlg);

    // 새 이미지 노드 준비
    const freshImg = () => {
      host.querySelector("#resumeImg")?.remove();
      const img = new Image();
      img.id="resumeImg"; img.alt="프로젝트이미지";
      img.decoding="async"; img.loading="eager"; img.style.opacity="0";
      host.appendChild(img); return img;
    };
    // 프리로드 유틸
    const preload = (src, srcset, sizes) => new Promise((res, rej)=>{
      const t = new Image(); if (sizes) t.sizes=sizes; if (srcset) t.srcset=srcset; t.decoding="async";
      t.onload = () => res({src, srcset, sizes}); t.onerror = rej; t.src = src;
    });

    // 열기
    async function open({thumb, full, srcset, sizes}){
      if (modal) return;
      modal = true; ok = false; pauseAll();
      dlg.showModal?.() ?? dlg.setAttribute("open","");
      ScrollLock.lock();
      $(".slider")?.classList.add("pe-none");

      const img = freshImg();
      // 썸네일 선표시
      try { const t = await preload(toAbs(thumb)); img.src = t.src; requestAnimationFrame(()=>img.style.opacity="1"); } catch {}

      // 모달 애니메이션 후 원본으로 스왑
      gsap.fromTo(sheet, { yPercent:-4, scale:0.98, autoAlpha:0 }, { yPercent:0, scale:1, autoAlpha:1, duration:0.35, ease:"power2.out",
        onComplete: async () => {
          try{
            const t = await preload(toAbs(full), srcset, sizes);
            if (t.sizes) img.sizes=t.sizes; else img.removeAttribute("sizes");
            if (t.srcset) img.srcset=t.srcset; else img.removeAttribute("srcset");
            img.src = t.src; // 동일 노드 교체 → 깜빡임 최소화
          } finally { setTimeout(()=>btnX?.focus(),10); }
        }
      });
    }
    // 닫기
    function close(){
      gsap.to(sheet, { yPercent:-4, scale:0.98, autoAlpha:0, duration:0.2, ease:"power2.in",
        onComplete: ()=>{
          dlg.close?.() || dlg.removeAttribute("open");
          ScrollLock.unlock();
          modal = false; last = Date.now();
          setTimeout(()=>{ ok = true; }, 100);
          $(".slider")?.classList.remove("pe-none");
          playActive();
        }
      });
    }

    // 위임 클릭 핸들러: 슬라이드의 "View Project"
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".slide_link a");
      if (!a) return;
      e.preventDefault();

      const i = Number(a.dataset.idx ?? -1);
      const d = slides[i];
      title && (title.textContent = d?.slideTitle || "Project");

      const thumb = d?.modalThumb || d?.modalImg || "img/img1.png";
      const full  = d?.modalImg   || "img/img1.png";
      const srcset= d?.modalSrcset || "";
      const sizes = "(min-width: 768px) 60vw, 90vw";

      if (btnDL){
        const href = toAbs(d?.modalDownload || full);
        btnDL.setAttribute("href", href);
        btnDL.setAttribute("download", (d?.modalDownload || full).split("/").pop());
      }
      open({ thumb, full, srcset, sizes });
    });

    btnX?.addEventListener("click", close);
    dlg.addEventListener("cancel", e => { e.preventDefault(); close(); });
    dlg.addEventListener("click", e => {
      const r = sheet.getBoundingClientRect();
      const inside = (e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom);
      if (!inside) close();
    });
  })();
});
