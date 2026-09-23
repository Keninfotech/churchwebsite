// Progressive enhancement — nav, reveal variants, counters, image blur-up, page transitions
(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  // ---------- Mobile nav toggle (with hamburger bar element) ----------
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-primary-nav]");

  if (toggle) {
    if (!toggle.querySelector(".bar")) {
      var bar = document.createElement("span");
      bar.className = "bar";
      bar.setAttribute("aria-hidden", "true");
      toggle.appendChild(bar);
    }

    // hide text visually while keeping accessible
    if (toggle.firstChild && toggle.firstChild.nodeType === 3) {
      var label = toggle.firstChild.nodeValue.trim();
      toggle.setAttribute("aria-label", label || "Menu");
      toggle.firstChild.nodeValue = "";
    }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (
        e.target &&
        e.target.tagName === "A" &&
        nav.classList.contains("is-open")
      ) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }


  // ---------- Submenu accessibility & interaction ----------
  document.querySelectorAll(".has-sub").forEach(function (parent) {
    var btn = parent.querySelector(".nav-parent");
    if (!btn) return;

    btn.setAttribute("tabindex", "0");
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");

    btn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();

        var open = parent.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }
    });

    btn.addEventListener("click", function (e) {
      e.preventDefault();

      document.querySelectorAll(".has-sub.is-open").forEach(function (other) {
        if (other !== parent) {
          other.classList.remove("is-open");

          var ob = other.querySelector(".nav-parent");
          if (ob) {
            ob.setAttribute("aria-expanded", "false");
          }
        }
      });

      var open = parent.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });


  document.addEventListener("click", function (e) {
    if (!e.target.closest(".has-sub")) {
      document.querySelectorAll(".has-sub.is-open").forEach(function (el) {
        el.classList.remove("is-open");

        var b = el.querySelector(".nav-parent");
        if (b) {
          b.setAttribute("aria-expanded", "false");
        }
      });
    }
  });


  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".has-sub.is-open").forEach(function (el) {
        el.classList.remove("is-open");

        var b = el.querySelector(".nav-parent");
        if (b) {
          b.setAttribute("aria-expanded", "false");
        }
      });
    }
  });


  // ---------- Sticky header state ----------
  // Fixed version to prevent flickering during the shrink transition.
  var header = document.querySelector(".site-header");

  if (header) {
    var headerScrolled = false;
    var scrollTicking = false;

    function updateHeader() {
      var y = window.scrollY || window.pageYOffset || 0;

      /*
       * Hysteresis:
       *
       * Enter compact mode after 80px.
       * Do not return to full mode until we are below 15px.
       *
       * This provides a generous 65px buffer that completely prevents
       * the class from flipping back and forth or causing any scroll stutter.
       */
      if (!headerScrolled && y > 80) {
        headerScrolled = true;
        header.classList.add("scrolled");
      }
      else if (headerScrolled && y < 15) {
        headerScrolled = false;
        header.classList.remove("scrolled");
      }

      scrollTicking = false;
    }

    function onScroll() {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateHeader);
        scrollTicking = true;
      }
    }

    updateHeader();

    window.addEventListener("scroll", onScroll, {
      passive: true
    });
  }


  // ---------- Reveal variants ----------
  // Auto-assign a reveal variant to elements without an explicit one,
  // rotating through fade-up / fade-scale / slide-left / slide-right
  // to vary rhythm.
  var VARIANTS = [
    "fade-up",
    "fade-scale",
    "slide-left",
    "fade-up",
    "slide-right"
  ];

  var vIdx = 0;

  function ensureVariant(el) {
    var v = el.getAttribute("data-reveal");

    if (!v) {
      v = VARIANTS[vIdx++ % VARIANTS.length];
      el.setAttribute("data-reveal", v);
    }

    return v;
  }


  // ---------- Elements to reveal ----------
  var explicit = document.querySelectorAll(
    "[data-reveal], [data-reveal-stagger]"
  );

  var auto = document.querySelectorAll(
    ".section-head, .prose, figure, .card, .tile, .person, .stack__item, .priest-card"
  );

  var autoContainers = document.querySelectorAll(
    ".grid, .rows, .footer-grid, .embed-grid, .prose > ul, .prose > ol"
  );


  var observer =
    ("IntersectionObserver" in window) && !reduced
      ? new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              observer.unobserve(e.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -60px 0px"
        }
      )
      : null;


  function watch(el) {
    if (observer) {
      observer.observe(el);
    }
    else {
      el.classList.add("is-in");
    }
  }


  explicit.forEach(function (el) {
    if (
      el.hasAttribute("data-reveal") &&
      el.getAttribute("data-reveal") === ""
    ) {
      // legacy: promote to a variant
      ensureVariant(el);
    }

    watch(el);
  });


  auto.forEach(function (el) {
    if (
      !el.hasAttribute("data-reveal") &&
      !el.closest("[data-reveal-stagger]")
    ) {
      ensureVariant(el);
      watch(el);
    }
  });


  autoContainers.forEach(function (el) {
    if (
      !el.hasAttribute("data-reveal") &&
      !el.hasAttribute("data-reveal-stagger")
    ) {
      el.setAttribute("data-reveal-stagger", "");
      watch(el);
    }
  });


  // ---------- Counter animation ----------
  function animateCount(el) {
    var target = parseInt(
      (
        el.getAttribute("data-counter") ||
        el.textContent ||
        "0"
      ).replace(/[^\d-]/g, ""),
      10
    );

    if (isNaN(target)) return;

    if (reduced) {
      el.textContent = String(target);
      return;
    }

    var dur = 1400;
    var start = performance.now();

    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);

      el.textContent = Math.round(target * eased).toString();

      if (t < 1) {
        requestAnimationFrame(tick);
      }
      else {
        el.textContent = String(target);
      }
    }

    requestAnimationFrame(tick);
  }


  // ---------- Auto-tag the jubilee "25" badge and any [data-counter] elements ----------
  var jubilee = document.querySelector(".hero__art-badge .num");

  if (
    jubilee &&
    !jubilee.hasAttribute("data-counter")
  ) {
    jubilee.setAttribute(
      "data-counter",
      jubilee.textContent.trim()
    );
  }


  var counters = document.querySelectorAll("[data-counter]");

  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              animateCount(e.target);
              cio.unobserve(e.target);
            }
          });
        },
        {
          threshold: 0.4
        }
      );

      counters.forEach(function (el) {
        el.textContent = "0";
        cio.observe(el);
      });
    }
    else {
      counters.forEach(animateCount);
    }
  }


  // ---------- Button magnetic / ripple origin ----------
  document.querySelectorAll(".btn").forEach(function (btn) {
    var r = null;
    var rScrollY = 0;

    // measure once per hover (and after scrolling) instead of on every pointer move
    btn.addEventListener("pointerleave", function () {
      r = null;
    });

    btn.addEventListener("pointermove", function (e) {
      if (!r || rScrollY !== window.scrollY) {
        r = btn.getBoundingClientRect();
        rScrollY = window.scrollY;
      }

      btn.style.setProperty(
        "--mx",
        ((e.clientX - r.left) / r.width * 100) + "%"
      );

      btn.style.setProperty(
        "--my",
        ((e.clientY - r.top) / r.height * 100) + "%"
      );
    });
  });


  // ---------- Image blur-up ----------
  document.querySelectorAll("img").forEach(function (img) {
    if (img.closest(".brand__crest")) return;

    img.classList.add("motion-img");

    var mark = function () {
      img.classList.add("is-loaded");
    };

    if (
      img.complete &&
      img.naturalWidth > 0
    ) {
      mark();
    }
    else {
      img.addEventListener("load", mark, {
        once: true
      });

      img.addEventListener("error", mark, {
        once: true
      });
    }
  });


  // ---------- Smooth anchor with header offset ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");

      if (id && id.length > 1) {
        var t = document.querySelector(id);

        if (t) {
          e.preventDefault();

          t.scrollIntoView({
            behavior: reduced ? "auto" : "smooth",
            block: "start"
          });
        }
      }
    });
  });


  // ---------- Page transitions (View Transitions API + fallback) ----------
  var supportsVT =
    typeof document.startViewTransition === "function";

  document.documentElement.classList.add("pt-fade");

  window.addEventListener("pageshow", function () {
    document.documentElement.classList.remove("pt-out");
  });


  if (!reduced) {
    document.addEventListener("click", function (e) {
      var a =
        e.target.closest &&
        e.target.closest("a");

      if (!a) return;

      var href = a.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        a.target === "_blank" ||
        a.hasAttribute("download")
      ) {
        return;
      }

      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      var url;

      try {
        url = new URL(
          a.href,
          window.location.href
        );
      }
      catch (_) {
        return;
      }

      if (
        url.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        url.pathname ===
        window.location.pathname &&
        url.hash
      ) {
        return;
      }


      if (supportsVT) {
        e.preventDefault();

        document.startViewTransition(
          function () {
            window.location.href = url.href;
          }
        );
      }
      else {
        e.preventDefault();

        document.documentElement.classList.add(
          "pt-out"
        );

        setTimeout(function () {
          window.location.href = url.href;
        }, 240);
      }
    });
  }


  // ---------- Awards: seamless-loop horizontal auto-scroll ----------
  (function () {
    const wrapper = document.querySelector("[data-awards-scroll]");
    if (!wrapper) return;

    // Duplicate once for seamless infinite loop
    if (!wrapper.dataset.looped) {
      const items = Array.from(wrapper.children);
      items.forEach(function (item) {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        wrapper.appendChild(clone);
      });
      wrapper.dataset.looped = "1";
    }

    let isPaused = false;
    let isInteracting = false;
    let resumeTimeout = null;
    let exactScroll = wrapper.scrollLeft || 0;
    let lastTime = performance.now();
    const pixelsPerSecond = 40; // Silky smooth sliding speed

    // Layout values are measured on resize, not every frame
    let halfWidth = 0;
    let canScroll = false;
    function measure() {
      halfWidth = wrapper.scrollWidth / 2;
      canScroll = wrapper.scrollWidth > wrapper.clientWidth;
    }
    measure();
    if ("ResizeObserver" in window) {
      new ResizeObserver(measure).observe(wrapper);
    } else {
      window.addEventListener("resize", measure, { passive: true });
    }
    // images inside may finish loading after the first measure
    wrapper.querySelectorAll("img").forEach(function (img) {
      if (!img.complete) img.addEventListener("load", measure, { once: true });
    });

    // Pause on hover
    wrapper.addEventListener("mouseenter", function () {
      isPaused = true;
    });
    wrapper.addEventListener("mouseleave", function () {
      if (!isInteracting) isPaused = false;
    });

    // Touch interaction handling for mobile
    wrapper.addEventListener("touchstart", function () {
      isPaused = true;
      isInteracting = true;
      clearTimeout(resumeTimeout);
    }, { passive: true });

    wrapper.addEventListener("touchend", function () {
      isInteracting = false;
      resumeTimeout = setTimeout(function () {
        exactScroll = wrapper.scrollLeft;
        isPaused = false;
      }, 1500);
    }, { passive: true });

    // Sync position if user drags/scrolls scrollbar
    wrapper.addEventListener("scroll", function () {
      if (isPaused || isInteracting) {
        exactScroll = wrapper.scrollLeft;
      }
    }, { passive: true });

    // Only run the frame loop while the strip is on screen and the tab is visible
    let running = false;
    let onScreen = true;
    let frameId = 0;

    function animate(currentTime) {
      if (!running) return;

      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (!isPaused && !isInteracting && canScroll) {
        exactScroll += pixelsPerSecond * Math.min(dt, 0.1);

        if (exactScroll >= halfWidth) {
          exactScroll -= halfWidth;
        }

        wrapper.scrollLeft = exactScroll;
      }

      frameId = requestAnimationFrame(animate);
    }

    function start() {
      if (running || !onScreen || document.hidden) return;
      running = true;
      frameId = requestAnimationFrame(function (time) {
        lastTime = time;
        frameId = requestAnimationFrame(animate);
      });
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frameId);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        onScreen ? start() : stop();
      }).observe(wrapper);
    }

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });

    start();
  })();


  // ---------- Lazy-load below-the-fold videos ----------
  // <video data-lazy-video data-src="..." preload="none"></video>
  (function () {
    const videos = document.querySelectorAll("video[data-lazy-video][data-src]");
    if (!videos.length) return;

    function load(video) {
      video.src = video.dataset.src;
      video.removeAttribute("data-src");
      if (video.autoplay) {
        const p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    }

    if (!("IntersectionObserver" in window)) {
      videos.forEach(load);
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          load(entry.target);
        }
      });
    }, { rootMargin: "300px 0px" });

    videos.forEach(function (v) {
      io.observe(v);
    });
  })();


  // ---------- Looping marquee: duplicate track for seamless scroll ----------
  document.querySelectorAll(".marquee").forEach(function (m) {
    var track =
      m.querySelector(".marquee__track");

    if (
      !track ||
      track.dataset.cloned === "1"
    ) {
      return;
    }

    var clone = track.cloneNode(true);

    clone.setAttribute(
      "aria-hidden",
      "true"
    );

    track.parentNode.appendChild(clone);

    track.dataset.cloned = "1";
  });


  // ---------- Services scrollytelling ----------
  function scrolly() {
    const root =
      document.querySelector(
        "[data-scrolly]"
      );

    if (!root) return;

    const steps =
      root.querySelectorAll(".step");

    const imgs =
      root.querySelectorAll(
        ".scrolly-media .img"
      );


    const io =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              const i =
                +e.target.dataset.idx;

              steps.forEach(function (s, j) {
                s.classList.toggle(
                  "on",
                  j === i
                );
              });

              imgs.forEach(function (im, j) {
                im.classList.toggle(
                  "on",
                  j === i
                );
              });
            }
          });
        },
        {
          threshold: 0.6,
          rootMargin:
            "-20% 0px -20% 0px"
        }
      );


    steps.forEach(function (s) {
      io.observe(s);
    });


    if (imgs[0]) {
      imgs[0].classList.add("on");
    }

    if (steps[0]) {
      steps[0].classList.add("on");
    }
  }


  scrolly();


  // ---------- Lazy-load inline backgrounds ----------
  function lazyInlineBackgrounds() {
    const selectors =
      '.scrolly-media .img[style*="background-image"]';

    const els =
      document.querySelectorAll(selectors);

    if (!els.length) return;

    const deferred = [];


    els.forEach(function (el, index) {
      const isVisible =
        el.classList.contains("active") ||
        el.classList.contains("on") ||
        el.closest(".slide.active") ||
        el.closest(".slide:first-child");

      if (isVisible) return;


      const bg =
        el.style.backgroundImage;

      if (
        bg &&
        bg !== "none"
      ) {
        const url =
          bg
            .replace(/^url\(['"]?/, "")
            .replace(/['"]?\)$/, "");

        el.dataset.bg = url;
        el.style.backgroundImage = "none";

        deferred.push(el);
      }
    });


    if (!deferred.length) return;


    const io =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            const el = entry.target;

            if (el.dataset.bg) {
              el.style.backgroundImage =
                "url('" +
                el.dataset.bg +
                "')";

              delete el.dataset.bg;
            }

            io.unobserve(el);
          });
        },
        {
          rootMargin: "400px 0px",
          threshold: 0.01
        }
      );


    deferred.forEach(function (el) {
      io.observe(el);
    });
  }


  lazyInlineBackgrounds();

})();