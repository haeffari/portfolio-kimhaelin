import slides from "./slides.js";
gsap.registerPlugin(SplitText);

document.addEventListener("DOMContentLoaded", () => {
  // ====================== 기본 유틸 ======================
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const toAbs = (path) => path ? new URL(path, document.baseURI).href : "";

  // ====================== 시작 슬라이드 결정 ======================
  function getStartIndex(total){
    const q = new URLSearchParams(location.search);
    const slug = q.get("project");
    const num  = Number(q.get("slide"));

    if (slug){
      // 1) slug 정확히 일치
      const exact = slides.findIndex(s => (s.slug || "") === slug);
      if (exact !== -1) return exact + 1;

      // 2) 이미지 경로/제목에 slug 포함
      const fuzzy = slides.findIndex(s =>
        (s.modalImg || "").includes(slug) ||
        (s.slideTitle || "").toLowerCase().includes(slug.toLowerCase())
      );
      if (fuzzy !== -1) return fuzzy + 1;
    }

    if (Number.isInteger(num) && num >= 1 && num <= total) return num;
    return 1;
  }

  // ====================== 전역 상태 ======================
  const total = slides.length;
  let curIndex = getStartIndex(total); // 1부터 시작
  let isAnimating = false;             // 슬라이드 전환 중
  let inputEnabled = true;             // 입력 허용
  let lastInputAt = 0;                 // 마지막 입력 시각(ms)
  let modalOpen = false;               // 모달 열림 여부

  // ====================== 비디오 제어 ======================
  function pauseAllVideos(){
    $$("video").forEach(v => { try{ v.pause(); } catch{} });
  }
  function playActiveVideo(){
    const v = $(".slide.is-active video");
    if (!v) return;
    v.muted = true;
    v.play().catch(()=>{});
  }

  // ====================== 스크롤 락 ======================
  const ScrollLock = (() => {
    let savedY = 0;
    let prevPaddingRight = "";

    function lock(){
      savedY = window.scrollY;
      const html = document.documentElement;
      const body = document.body;
      const sbw = window.innerWidth - html.clientWidth; // 스크롤바 폭

      prevPaddingRight = body.style.paddingRight || "";
      body.style.paddingRight = sbw > 0 ? `${sbw}px` : "";

      body.classList.add("is_modal_open");
      html.classList.add("is_modal_open");

      body.style.position = "fixed";
      body.style.top = `-${savedY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.transform = "translateZ(0)";
    }

    function unlock(){
      const html = document.documentElement;
      const body = document.body;

      body.classList.remove("is_modal_open");
      html.classList.remove("is_modal_open");

      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.transform = "";
      body.style.paddingRight = prevPaddingRight;

      window.scrollTo(0, savedY);
    }

    return { lock, unlock };
  })();

  // ====================== 파일 다운로드 ======================
  async function downloadFile(url, filename="download"){
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectURL);
  }

  // ====================== 슬라이드 DOM 만들기 ======================
  function createSlideDOM(oneBasedIndex){
    const data = slides[oneBasedIndex - 1];
    const slide = document.createElement("div");
    slide.className = "slide";

    // 비디오 박스
    const videoWrap = document.createElement("div");
    videoWrap.className = "slide_video";

    const video = document.createElement("video");
    video.className = "slide_video_el";
    video.preload = "metadata";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.src = toAbs(data.slideVideo);

    // 비디오 실패 → 이미지 폴백
    video.addEventListener("error", () => {
      const img = new Image();
      img.alt = data.slideTitle || "project image";
      img.decoding = "async";
      img.loading = "eager";
      img.src = toAbs(data.modalImg || "img/fallback.jpg");
      video.replaceWith(img);
    });

    // 재생 트리거(가시 상태 또는 첫 상호작용)
    requestAnimationFrame(() => {
      const tryPlay = () => video.play().catch(()=>{});
      if (document.visibilityState === "visible") tryPlay();
      window.addEventListener("pointerdown", tryPlay, { once:true });
    });

    videoWrap.appendChild(video);

    // 텍스트 묶음
    const header = document.createElement("div");
    header.className = "slide_header";

    const titleBox = document.createElement("div");
    titleBox.className = "slide_title";
    const h1 = document.createElement("h1");
    h1.textContent = data.slideTitle;
    titleBox.appendChild(h1);

    const descBox = document.createElement("div");
    descBox.className = "slide_description";
    const p = document.createElement("p");
    p.textContent = data.slideDescription;
    descBox.appendChild(p);

    const linkBox = document.createElement("div");
    linkBox.className = "slide_link";
    const a = document.createElement("a");
    a.textContent = "View Project";
    a.href = "#";
    a.dataset.idx = String(oneBasedIndex - 1);
    linkBox.appendChild(a);

    header.append(titleBox, descBox, linkBox);

    // 인덱스/태그
    const info = document.createElement("div");
    info.className = "slide_info";

    const idxWrap = document.createElement("div");
    idxWrap.className = "index_wrapper";
    const cur = document.createElement("p");
    cur.textContent = String(oneBasedIndex).padStart(2, "0");
    const slash = document.createElement("p");
    slash.textContent = "/";
    const tot = document.createElement("p");
    tot.textContent = String(total).padStart(2, "0");
    idxWrap.append(cur, slash, tot);

    const tags = document.createElement("div");
    tags.className = "slide_tags";
    const tagLabel = document.createElement("p");
    tagLabel.textContent = "Tags";
    tags.appendChild(tagLabel);
    (data.slideTags || []).forEach(tag => {
      const tp = document.createElement("p");
      tp.textContent = tag;
      tags.appendChild(tp);
    });

    info.append(idxWrap, tags);

    // 조립
    slide.append(videoWrap, header, info);
    return slide;
  }

  // ====================== SplitText ======================
  function splitInside(slideEl){
    const h1 = slideEl.querySelector(".slide_title h1");
    if (h1){
      SplitText.create(h1, { type:"words", wordsClass:"word", mask:"words" });
    }
    const targets = $$(".slide_description p, .slide_link a, .slide_tags p, .index_wrapper p", slideEl);
    targets.forEach(el => {
      SplitText.create(el, { type:"lines", linesClass:"line", mask:"lines", reduceWhiteSpace:false });
    });
  }

  // ====================== 초기 렌더 ======================
  function renderFirst(){
    const root = $(".slider");
    if (!root) return;

    root.querySelectorAll(":scope > .slide").forEach(el => el.remove());

    const slide = createSlideDOM(curIndex);
    slide.classList.add("is-active");
    root.appendChild(slide);

    splitInside(slide);
    gsap.set(slide.querySelectorAll(".word, .line"), { y:"0%", clearProps:"transform" });

    playActiveVideo();
  }

  // ====================== 슬라이드 전환 ======================
  function changeSlide(direction){ // direction: "down" | "up"
    if (isAnimating) return;
    if (!inputEnabled) return;

    isAnimating = true;
    inputEnabled = false;

    const root = $(".slider");
    const current = root.querySelector(".slide.is-active");

    // 다음 인덱스 계산
    if (direction === "down"){
      curIndex = (curIndex === total) ? 1 : curIndex + 1;
    } else {
      curIndex = (curIndex === 1) ? total : curIndex - 1;
    }

    pauseAllVideos();

    // 방향에 따른 값
    const exitY  = direction === "down" ? "-200vh" : "200vh";
    const entryY = direction === "down" ? "100vh"  : "-100vh";
    const clipIn = direction === "down"
      ? "polygon(20% 20%,80% 20%,80% 100%,20% 100%)"
      : "polygon(20% 0%,80% 0%,80% 80%,20% 80%)";

    // 현재 슬라이드 아웃
    current.classList.remove("is-active");
    gsap.to(current, {
      scale: 0.25,
      opacity: 0,
      rotation: 30,
      y: exitY,
      duration: 2,
      ease: "power4.inOut",
      force3D: true,
      onComplete: () => current.remove()
    });

    // 다음 슬라이드 인
    setTimeout(() => {
      const next = createSlideDOM(curIndex);
      next.classList.add("is-active");
      gsap.set(next, { y: entryY, clipPath: clipIn, force3D: true });
      root.appendChild(next);

      splitInside(next);
      const textEls = next.querySelectorAll(".word, .line");
      gsap.set(textEls, { y: "100%", force3D: true });

      gsap.to(next, {
        y: 0,
        clipPath: "polygon(0% 0%,100% 0%,100% 100%,0% 100%)",
        duration: 1.5,
        ease: "power4.out",
        force3D: true,
        onStart: () => {
          const tl = gsap.timeline();
          tl.to(next.querySelectorAll(".slide_title .word"), { y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, 0.75)
            .to(next.querySelectorAll(".slide_tags .line"),   { y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, "-=0.75")
            .to(next.querySelectorAll(".index_wrapper .line"),{ y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, "<")
            .to(next.querySelectorAll(".slide_description .line"), { y:"0%", duration:1, ease:"power4.out", stagger:0.1 }, "<")
            .to(next.querySelectorAll(".slide_link .line"),   { y:"0%", duration:1, ease:"power4.out" }, "-=1");
        },
        onComplete: () => {
          playActiveVideo();
          isAnimating = false;
          setTimeout(() => { inputEnabled = true; lastInputAt = Date.now(); }, 100);
        }
      });
    }, 750);
  }

  // ====================== 입력 처리 ======================
  function step(direction){
    const now = Date.now();
    if (isAnimating) return;
    if (!inputEnabled) return;
    if (now - lastInputAt < 1000) return; // 연타 방지(1초)
    lastInputAt = now;
    changeSlide(direction);
  }

  // 휠
  window.addEventListener("wheel", (e) => {
    if (modalOpen) return;
    e.preventDefault();
    step(e.deltaY > 0 ? "down" : "up");
  }, { passive:false });

  // 터치 스와이프
  let touchStartY = 0;
  let touching = false;

  window.addEventListener("touchstart", (e) => {
    if (modalOpen) return;
    touchStartY = e.touches[0].clientY;
    touching = true;
  }, { passive:false });

  window.addEventListener("touchmove", (e) => {
    if (modalOpen) return;
    e.preventDefault();
    if (!touching) return;
    if (isAnimating) return;
    if (!inputEnabled) return;

    const dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) > 50){
      touching = false;
      step(dy > 0 ? "down" : "up");
    }
  }, { passive:false });

  window.addEventListener("touchend", () => { touching = false; });

  // ====================== 첫 렌더 ======================
  renderFirst();

  // ====================== bfcache 복귀 ======================
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    curIndex = getStartIndex(total);
    renderFirst();
    lastInputAt = Date.now();
  });

  // ====================== 공통 모달 애니 유틸 ======================
  function openModalBase(dialogEl, sheetEl, afterOpenFocusEl){
    modalOpen = true;
    inputEnabled = false;
    pauseAllVideos();

    dialogEl.showModal?.() ?? dialogEl.setAttribute("open", "");
    ScrollLock.lock();
    $(".slider")?.classList.add("pe-none");

    gsap.fromTo(
      sheetEl,
      { yPercent:-4, scale:0.98, autoAlpha:0 },
      {
        yPercent:0, scale:1, autoAlpha:1, duration:0.35, ease:"power2.out",
        onComplete: () => setTimeout(() => afterOpenFocusEl?.focus(), 10)
      }
    );
  }

  function closeModalBase(dialogEl, sheetEl){
    gsap.to(sheetEl, {
      yPercent:-4, scale:0.98, autoAlpha:0, duration:0.2, ease:"power2.in",
      onComplete: () => {
        dialogEl.close?.() || dialogEl.removeAttribute("open");
        ScrollLock.unlock();
        modalOpen = false;
        lastInputAt = Date.now();
        setTimeout(() => { inputEnabled = true; }, 100);
        $(".slider")?.classList.remove("pe-none");
        playActiveVideo();
      }
    });
  }

  // ====================== 이력서 모달 ======================
  (function setupResumeModal(){
    const trigger = document.querySelector('a[href="#contact"]');
    const dlg  = $("#resumeDialog");
    if (!trigger || !dlg) return;

    const sheet = $(".modal_sheet", dlg);
    const btnClose = $("#resumeClose", dlg);
    const btnDownload = $("#resumeDownload", dlg);

    function open(){ openModalBase(dlg, sheet, btnClose); }
    function close(){ closeModalBase(dlg, sheet); }

    trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
    btnClose?.addEventListener("click", close);

    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dlg.addEventListener("click", (e) => {
      const r = sheet.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    });

    btnDownload?.addEventListener("click", async (e) => {
      e.preventDefault();
      const href = toAbs("/img/resume.png");
      try{
        await downloadFile(href, "resume.png");
      }catch{
        window.open(href, "_blank", "noopener");
      }
    });
  })();

  // ====================== 프로젝트 모달 ======================
  (function setupProjectModal(){
    const dlg = $("#projectDialog");
    if (!dlg) return;

    const sheet = $(".modal_sheet", dlg);
    const btnClose = $("#resumeClose", dlg);      // 기존 아이디 유지
    const btnDownload = $("#resumeDownload", dlg);// 기존 아이디 유지
    const titleEl = $("#resumeTitle", dlg);       // 기존 아이디 유지
    const bodyEl  = $(".modal_body", dlg);

    function freshMedia(isVideo){
      bodyEl.querySelector("#resumeImg")?.remove();
      bodyEl.querySelector("#resumeVideo")?.remove();

      if (isVideo) {
        const v = document.createElement("video");
        v.id = "resumeVideo";
        v.controls = false;
        v.autoplay = true;
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        v.style.opacity = "0";
        v.style.height = "100%";
        v.style.objectFit = "contain";
        v.style.backgroundColor = "#000";
        bodyEl.appendChild(v);
        return v;
      }

      const img = new Image();
      img.id = "resumeImg";
      img.alt = "프로젝트이미지";
      img.decoding = "async";
      img.loading = "eager";
      img.style.opacity = "0";
      bodyEl.appendChild(img);
      return img;
    }

    function preload(src, srcset, sizes){
      return new Promise((resolve, reject) => {
        const t = new Image();
        if (sizes) t.sizes = sizes;
        if (srcset) t.srcset = srcset;
        t.decoding = "async";
        t.onload = () => resolve({ src, srcset, sizes });
        t.onerror = reject;
        t.src = src;
      });
    }

    async function openWithImages({ thumb, full, srcset, sizes }) {
      if (modalOpen) return;

      const isVideo = full.endsWith(".mp4");

      openModalBase(dlg, sheet, btnClose);

      // ✅ 새 미디어 객체 생성
      const media = freshMedia(isVideo);

      // ✅ 비디오일 경우: 이미지 프리로드 안하고 바로 소스 넣고 재생하기
      if (isVideo) {
        media.src = toAbs(full);
        media.style.opacity = "1";
        media.play?.();
        return;
      }

      // ✅ 이미지일 경우: 기존 흐름 유지
      try {
        const t = await preload(toAbs(thumb));
        media.src = t.src;
        requestAnimationFrame(() => { media.style.opacity = "1"; });
      } catch {}

      try {
        const t = await preload(toAbs(full), srcset, sizes);
        if (t.sizes) media.sizes = t.sizes;
        if (t.srcset) media.srcset = t.srcset;
        media.src = t.src;
      } finally {
        setTimeout(() => btnClose?.focus(), 10);
      }
    }

    function close(){ closeModalBase(dlg, sheet); }

    // 슬라이드의 "View Project" 버튼 위임
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".slide_link a");
      if (!a) return;
      e.preventDefault();

      const i = Number(a.dataset.idx ?? -1);
      const d = slides[i];
      if (!d) return;

      if (titleEl) titleEl.textContent = d.slideTitle || "Project";

      const thumb  = d.modalThumb || d.modalImg || "img/img1.png";
      const full   = d.modalImg   || "img/img1.png";
      const srcset = d.modalSrcset || "";
      const sizes  = "(min-width: 768px) 60vw, 90vw";

      if (btnDownload){
        const href = toAbs(d.modalDownload || full);
        btnDownload.setAttribute("href", href);
        btnDownload.setAttribute("download", (d.modalDownload || full).split("/").pop());
      }

      openWithImages({ thumb, full, srcset, sizes });
    });

    btnClose?.addEventListener("click", close);
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    dlg.addEventListener("click", (e) => {
      const r = sheet.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    });
  })();
});
