// projects.js (통합 정리본)
// - 카드에서 projects.html?project=슬러그 로 진입 시 해당 슬라이드부터 시작
// - 모달 오픈 시 버벅임 감소(ScrollLock, 합성 힌트)
// - 비디오 경로 절대화 + 로드 실패 시 이미지 폴백
// - bfcache 복원 대응

import slides from "./slides.js";
gsap.registerPlugin(SplitText);

document.addEventListener("DOMContentLoaded", () => {
  // ──────────────────────────────────────────────
  // 유틸
  // ──────────────────────────────────────────────
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const toAbs = (path) => (path ? new URL(path, document.baseURI).href : "");

  // 시작 인덱스 계산: ?project=슬러그  또는  ?slide=번호(1-based)
  function getStartIndex(total) {
    const params = new URLSearchParams(location.search);
    const slug = params.get("project");
    const num  = Number(params.get("slide"));

    if (slug) {
      // 정확 매칭(slides.js에 slug를 넣어두는 것을 권장)
      const exact = slides.findIndex(s => (s.slug || "") === slug);
      if (exact !== -1) return exact + 1;

      // 느슨 매칭(슬러그가 파일명/타이틀 일부와 겹칠 때)
      const loose = slides.findIndex(s =>
        (s.modalImg || "").includes(slug) ||
        (s.slideTitle || "").toLowerCase().includes(slug.toLowerCase())
      );
      if (loose !== -1) return loose + 1;
    }

    if (Number.isInteger(num) && num >= 1 && num <= total) return num;
    return 1;
  }

  // ──────────────────────────────────────────────
  // 상태값
  // ──────────────────────────────────────────────
  const totalSlides = slides.length;
  let currentSlide  = getStartIndex(totalSlides);
  let isAnimating   = false;
  let scrollAllowed = true;
  let lastScrollTime= 0;
  let isModalOpen   = false;

  // ──────────────────────────────────────────────
  // ScrollLock: 버벅임 줄이는 position:fixed 방식 + 스크롤바 폭 보정
  // ──────────────────────────────────────────────
  const ScrollLock = (() => {
    let y = 0;
    let prBackup = "";
    return {
      lock() {
        y = window.scrollY || window.pageYOffset;

        const docEl = document.documentElement;
        const body  = document.body;
        const sbw = window.innerWidth - docEl.clientWidth;

        prBackup = body.style.paddingRight || "";
        body.style.paddingRight = sbw > 0 ? `${sbw}px` : "";

        body.classList.add("is_modal_open");
        docEl.classList.add("is_modal_open");

        body.style.position = "fixed";
        body.style.top = `-${y}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";

        // 합성 힌트
        body.style.willChange = "transform";
        body.style.transform = "translateZ(0)";
      },
      unlock() {
        const body = document.body;
        const docEl = document.documentElement;

        body.classList.remove("is_modal_open");
        docEl.classList.remove("is_modal_open");

        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.willChange = "";
        body.style.transform = "";

        body.style.paddingRight = prBackup;
        window.scrollTo(0, y);
      }
    };
  })();

  // ──────────────────────────────────────────────
  // 다운로드(Blob 우회)
  // ──────────────────────────────────────────────
  async function downloadFile(url, filename) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("다운로드 실패");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }

  // ──────────────────────────────────────────────
  // 슬라이드 DOM 생성
  // ──────────────────────────────────────────────
  function createSlide(slideIndex) {
    const d = slides[slideIndex - 1];

    const slide = document.createElement("div");
    slide.className = "slide";

    // 1) 비디오
    const video = document.createElement("video");
    video.className = "slide_video_el";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
    video.src = toAbs(d.slideVideo); // 경로 절대화

    const slideVideo = document.createElement("div");
    slideVideo.className = "slide_video";
    slideVideo.appendChild(video);

    // 비디오 로드 실패 → 이미지 폴백
    video.addEventListener("error", () => {
      console.warn("[VIDEO] load failed:", video.currentSrc || video.src, video.error);
      const img = document.createElement("img");
      img.alt = d.slideTitle || "project image";
      img.decoding = "async";
      img.loading = "eager";
      img.src = toAbs(d.modalImg || "img/fallback.jpg");
      video.replaceWith(img);
    });

    // 메타데이터 후 재생속도
    video.addEventListener("loadedmetadata", () => { video.playbackRate = 1.2; });

    // DOM 부착 후 play 시도(iOS 정책 회피)
    requestAnimationFrame(() => {
      const tryPlay = () => video.play().catch(() => {});
      if (document.visibilityState === "visible") tryPlay();
      window.addEventListener("pointerdown", tryPlay, { once: true });
    });

    // 2) 상단 헤더
    const slideHeader = document.createElement("div");
    slideHeader.className = "slide_header";

    const slideTitle = document.createElement("div");
    slideTitle.className = "slide_title";
    const h1 = document.createElement("h1");
    h1.textContent = d.slideTitle;
    slideTitle.appendChild(h1);

    const slideDescription = document.createElement("div");
    slideDescription.className = "slide_description";
    const p = document.createElement("p");
    p.textContent = d.slideDescription;
    slideDescription.appendChild(p);

    const slideLink = document.createElement("div");
    slideLink.className = "slide_link";
    const a = document.createElement("a");
    a.textContent = "View Project";
    a.href = "#";
    a.dataset.idx = String(slideIndex - 1); // 어떤 슬라이드인지 추적
    slideLink.appendChild(a);

    slideHeader.append(slideTitle, slideDescription, slideLink);

    // 3) 하단 정보
    const slideInfo = document.createElement("div");
    slideInfo.className = "slide_info";

    const slideIndexWrapper = document.createElement("div");
    slideIndexWrapper.className = "index_wrapper";

    const idx = document.createElement("p");
    idx.textContent = String(slideIndex).padStart(2, "0");
    const sep = document.createElement("p");
    sep.textContent = "/";
    const total = document.createElement("p");
    total.textContent = String(totalSlides).padStart(2, "0");
    slideIndexWrapper.append(idx, sep, total);

    const slideTags = document.createElement("div");
    slideTags.className = "slide_tags";
    const tagsLabel = document.createElement("p");
    tagsLabel.textContent = "Tags";
    slideTags.appendChild(tagsLabel);

    (d.slideTags || []).forEach(tag => {
      const tagP = document.createElement("p");
      tagP.textContent = tag;
      slideTags.appendChild(tagP);
    });

    slideInfo.append(slideIndexWrapper, slideTags);

    // 최종 조립
    slide.append(slideVideo, slideHeader, slideInfo);
    return slide;
  }

  // ──────────────────────────────────────────────
  // SplitText 적용
  // ──────────────────────────────────────────────
  function splitText(slide) {
    const h1 = slide.querySelector(".slide_title h1");
    if (h1) {
      SplitText.create(h1, { type: "words", wordsClass: "word", mask: "words" });
    }
    $$(".slide_description p, .slide_link a, .slide_tags p, .index_wrapper p", slide)
      .forEach(el => {
        SplitText.create(el, { type: "lines", linesClass: "line", mask: "lines", reduceWhiteSpace: false });
      });
  }

  // ──────────────────────────────────────────────
  // 초기 마운트
  // ──────────────────────────────────────────────
  function mountInitialSlide() {
    const slider = $(".slider");
    if (!slider) return;
    slider.querySelectorAll(":scope > .slide").forEach(el => el.remove());
    const first = createSlide(currentSlide);
    slider.appendChild(first);
    splitText(first);
    const showNow = first.querySelectorAll(".word, .line");
    if (showNow.length) gsap.set(showNow, { y: "0%", clearProps: "transform" });
  }

  // ──────────────────────────────────────────────
  // 전환 애니메이션
  // ──────────────────────────────────────────────
  function animateSlide(direction) {
    if (isAnimating || !scrollAllowed) return;

    isAnimating = true;
    scrollAllowed = false;

    const slider = $(".slider");
    const currentSlideElement = slider.querySelector(".slide");

    currentSlide = (direction === "down")
      ? (currentSlide === totalSlides ? 1 : currentSlide + 1)
      : (currentSlide === 1 ? totalSlides : currentSlide - 1);

    const exitY  = direction === "down" ? "-200vh" : "200vh";
    const entryY = direction === "down" ? "100vh"  : "-100vh";
    const entryClipPath = (direction === "down")
      ? "polygon(20% 20%, 80% 20%, 80% 100%, 20% 100%)"
      : "polygon(20% 0%, 80% 0%, 80% 80%, 20% 80%)";

    gsap.to(currentSlideElement, {
      scale: 0.25, opacity: 0, rotation: 30, y: exitY,
      duration: 2, ease: "power4.inOut", force3D: true,
      onComplete: () => currentSlideElement.remove()
    });

    setTimeout(() => {
      const newSlide = createSlide(currentSlide);
      gsap.set(newSlide, { y: entryY, clipPath: entryClipPath, force3D: true });
      slider.appendChild(newSlide);

      splitText(newSlide);
      const words = newSlide.querySelectorAll(".word");
      const lines = newSlide.querySelectorAll(".line");
      gsap.set([...words, ...lines], { y: "100%", force3D: true });

      gsap.to(newSlide, {
        y: 0,
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 1.5,
        ease: "power4.out",
        force3D: true,
        onStart: () => {
          const tl = gsap.timeline();
          tl.to(newSlide.querySelectorAll(".slide_title .word"),
                { y: "0%", duration: 1, ease: "power4.out", stagger: 0.1, force3D: true }, 0.75);
          tl.to(newSlide.querySelectorAll(".slide_tags .line"),
                { y: "0%", duration: 1, ease: "power4.out", stagger: 0.1 }, "-=0.75");
          tl.to(newSlide.querySelectorAll(".index_wrapper .line"),
                { y: "0%", duration: 1, ease: "power4.out", stagger: 0.1 }, "<");
          tl.to(newSlide.querySelectorAll(".slide_description .line"),
                { y: "0%", duration: 1, ease: "power4.out", stagger: 0.1 }, "<");
          tl.to(newSlide.querySelectorAll(".slide_link .line"),
                { y: "0%", duration: 1, ease: "power4.out" }, "-=1");
        },
        onComplete: () => {
          isAnimating = false;
          setTimeout(() => { scrollAllowed = true; lastScrollTime = Date.now(); }, 100);
        }
      });
    }, 750);
  }

  // ──────────────────────────────────────────────
  // 입력 처리 (wheel/touch)
  // ──────────────────────────────────────────────
  function handleScroll(direction) {
    const now = Date.now();
    if (isAnimating || !scrollAllowed) return;
    if (now - lastScrollTime < 1000) return; // 디바운스
    lastScrollTime = now;
    animateSlide(direction);
  }

  // wheel
  window.addEventListener("wheel", (e) => {
    if (isModalOpen) return;
    e.preventDefault();
    handleScroll(e.deltaY > 0 ? "down" : "up");
  }, { passive: false });

  // touch
  let touchStartY = 0;
  let isTouchActive = false;

  window.addEventListener("touchstart", (e) => {
    if (isModalOpen) return;
    touchStartY = e.touches[0].clientY;
    isTouchActive = true;
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (isModalOpen) return;
    e.preventDefault();
    if (!isTouchActive || isAnimating || !scrollAllowed) return;
    const diff = touchStartY - e.touches[0].clientY;
    if (Math.abs(diff) > 50) {
      isTouchActive = false;
      handleScroll(diff > 0 ? "down" : "up");
    }
  }, { passive: false });

  window.addEventListener("touchend", () => { isTouchActive = false; });

  // ──────────────────────────────────────────────
  // 초기 마운트
  // ──────────────────────────────────────────────
  mountInitialSlide();

  // ──────────────────────────────────────────────
  // bfcache 복원
  // ──────────────────────────────────────────────
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      currentSlide = getStartIndex(totalSlides); // URL 기준 재계산
      mountInitialSlide();
      lastScrollTime = Date.now();
    }
  });

  // ──────────────────────────────────────────────
  // 이력서 모달
  // ──────────────────────────────────────────────
  (function resumeModal() {
    const link = document.querySelector('a[href="#contact"]');
    const dlg  = document.getElementById("resumeDialog");
    if (!link || !dlg) return;

    const sheet    = dlg.querySelector(".modal_sheet");
    const btnClose = dlg.querySelector("#resumeClose");
    const btnDL    = dlg.querySelector("#resumeDownload");

    const openModal = () => {
      isModalOpen = true;
      scrollAllowed = false;

      (typeof dlg.showModal === "function") ? dlg.showModal() : dlg.setAttribute("open", "");
      ScrollLock.lock();

      // 슬라이더 이벤트 잠깐 차단(hover/paint 줄이기)
      document.querySelector(".slider")?.classList.add("pe-none");

      gsap.fromTo(
        sheet,
        { yPercent: -4, scale: 0.98, autoAlpha: 0 },
        { yPercent: 0,  scale: 1.00, autoAlpha: 1, duration: 0.35, ease: "power2.out",
          onComplete: () => setTimeout(() => btnClose?.focus(), 10)
        }
      );
    };

    const closeModal = () => {
      gsap.timeline({
        onComplete: () => {
          dlg.close?.() || dlg.removeAttribute("open");
          ScrollLock.unlock();
          isModalOpen = false;
          lastScrollTime = Date.now();
          setTimeout(() => { scrollAllowed = true; }, 100);
          document.querySelector(".slider")?.classList.remove("pe-none");
        }
      }).to(sheet, { yPercent: -4, scale: 0.98, autoAlpha: 0, duration: 0.2, ease: "power2.in" });
    };

    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      openModal();
    });

    btnClose?.addEventListener("click", closeModal);
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(); });
    dlg.addEventListener("click", (e) => {
      const r = sheet.getBoundingClientRect();
      const inside = (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
      if (!inside) closeModal();
    });

    btnDL?.addEventListener("click", async (e) => {
      e.preventDefault();
      const href = toAbs("/img/resume.png");
      try {
        await downloadFile(href, "resume.png");
      } catch {
        window.open(href, "_blank", "noopener");
      }
    });
  })();

  // ──────────────────────────────────────────────
  // 프로젝트 모달(이미지 고해상도 지연 스왑)
  // ──────────────────────────────────────────────
  (function projectModal() {
    const dlg = document.getElementById("projectDialog");
    if (!dlg) return;

    const sheet    = dlg.querySelector(".modal_sheet");
    const btnClose = dlg.querySelector("#resumeClose");    // HTML 아이디 재활용
    const btnDL    = dlg.querySelector("#resumeDownload");
    const titleEl  = dlg.querySelector("#resumeTitle");
    const imgEl    = dlg.querySelector("#resumeImg");

    const swapImageAsync = (img, { src, srcset, sizes }) => {
      return new Promise((resolve) => {
        const temp = new Image();
        if (sizes)  temp.sizes  = sizes;
        if (srcset) temp.srcset = srcset;
        temp.decoding = "async";
        temp.onload = () => {
          if (sizes)  img.sizes  = sizes;  else img.removeAttribute("sizes");
          if (srcset) img.srcset = srcset; else img.removeAttribute("srcset");
          img.src = src;
          resolve();
        };
        temp.src = src;
      });
    };

    const openModal = ({ thumbSrc, hiSrc, hiSrcset, hiSizes }) => {
      if (isModalOpen) return;
      isModalOpen   = true;
      scrollAllowed = false;

      (typeof dlg.showModal === "function") ? dlg.showModal() : dlg.setAttribute("open", "");
      ScrollLock.lock();

      document.querySelector(".slider")?.classList.add("pe-none");

      if (imgEl) {
        if (thumbSrc) {
          imgEl.src = toAbs(thumbSrc);
          imgEl.removeAttribute("srcset");
          imgEl.removeAttribute("sizes");
        }
        imgEl.decoding = "async";
        imgEl.loading  = "eager";
        imgEl.fetchPriority = "low";
      }

      gsap.fromTo(
        sheet,
        { yPercent: -4, scale: 0.98, autoAlpha: 0 },
        {
          yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.35, ease: "power2.out",
          onComplete: async () => {
            if (imgEl && hiSrc) {
              imgEl.fetchPriority = "high";
              await swapImageAsync(imgEl, { src: toAbs(hiSrc), srcset: hiSrcset, sizes: hiSizes });
            }
            setTimeout(() => btnClose?.focus(), 10);
          }
        }
      );
    };

    const closeModal = () => {
      gsap.timeline({
        onComplete: () => {
          dlg.close?.() || dlg.removeAttribute("open");
          ScrollLock.unlock();
          isModalOpen = false;
          lastScrollTime = Date.now();
          setTimeout(() => { scrollAllowed = true; }, 100);
          document.querySelector(".slider")?.classList.remove("pe-none");
        }
      }).to(sheet, { yPercent: -4, scale: 0.98, autoAlpha: 0, duration: 0.2, ease: "power2.in" });
    };

    // 위임 클릭: .slide_link a
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".slide_link a");
      if (!link) return;

      e.preventDefault();
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);

      const idx  = Number(link.dataset.idx ?? -1);
      const data = slides[idx];

      if (titleEl) titleEl.textContent = (data?.slideTitle) || "Project";

      const thumbSrc  = data?.modalThumb || data?.modalImg || "img/img1.png";
      const hiSrc     = data?.modalImg   || "img/img1.png";
      const hiSrcset  = data?.modalSrcset || ""; // "img@1x.webp 1x, img@2x.webp 2x"
      const hiSizes   = "(min-width: 768px) 60vw, 90vw";

      if (btnDL) {
        const href = toAbs(data?.modalDownload || hiSrc);
        btnDL.setAttribute("href", href);
        const fn = (data?.modalDownload || hiSrc || "download").split("/").pop();
        btnDL.setAttribute("download", fn);
      }

      openModal({ thumbSrc, hiSrc, hiSrcset, hiSizes });
    });

    btnClose?.addEventListener("click", closeModal);
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(); });
    dlg.addEventListener("click", (e) => {
      const r = sheet.getBoundingClientRect();
      const inside = (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
      if (!inside) closeModal();
    });
  })();
});
                                            