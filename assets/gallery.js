/* Photo gallery: album tabs + lightbox.
   Grids only load small thumbnails; the full image is fetched when clicked. */
(function () {
  "use strict";

  // Album tabs
  document.querySelectorAll("[data-albums]").forEach(function (wrap) {
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });

  // Lightbox
  var lb, img, cap, items = [], idx = 0, lastFocus;

  function build() {
    lb = document.createElement("div");
    lb.className = "ols-lb";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML =
      '<div class="ols-lb__spin" aria-hidden="true"></div>' +
      '<img class="ols-lb__img" alt="">' +
      '<button type="button" class="ols-lb__close" aria-label="Close">&times;</button>' +
      '<button type="button" class="ols-lb__prev" aria-label="Previous photo">&#8249;</button>' +
      '<button type="button" class="ols-lb__next" aria-label="Next photo">&#8250;</button>' +
      '<div class="ols-lb__cap" aria-live="polite"></div>';
    // Mounted on <html>, not <body>: the page-transition animation leaves a transform on
    // <body>, which would make position:fixed scroll with the page.
    document.documentElement.appendChild(lb);
    img = lb.querySelector(".ols-lb__img");
    cap = lb.querySelector(".ols-lb__cap");

    img.addEventListener("load", function () { lb.classList.remove("is-loading"); });
    img.addEventListener("error", function () { lb.classList.remove("is-loading"); });
    lb.querySelector(".ols-lb__close").addEventListener("click", close);
    lb.querySelector(".ols-lb__prev").addEventListener("click", function () { go(-1); });
    lb.querySelector(".ols-lb__next").addEventListener("click", function () { go(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  function show(i) {
    idx = (i + items.length) % items.length;
    var a = items[idx];
    // Reserve the final size up front so the layout doesn't jump when the full image arrives
    var w = +a.dataset.w, h = +a.dataset.h;
    var s = Math.min(window.innerWidth * (window.innerWidth <= 600 ? 1 : 0.94) / w, window.innerHeight * 0.86 / h, 1);
    img.style.width = Math.round(w * s) + "px";
    img.style.height = Math.round(h * s) + "px";
    lb.classList.add("is-loading");
    img.alt = a.querySelector("img").alt;
    img.src = a.dataset.full;
    cap.textContent = (idx + 1) + " / " + items.length;
    var multi = items.length > 1;
    lb.querySelector(".ols-lb__prev").hidden = !multi;
    lb.querySelector(".ols-lb__next").hidden = !multi;
  }

  function go(d) { show(idx + d); }

  function open(a) {
    if (!lb) build();
    items = Array.prototype.slice.call(a.closest("[data-gallery]").querySelectorAll(".ols-grid__item"));
    lastFocus = a;
    lb.hidden = false;
    document.documentElement.style.overflow = "hidden";
    show(items.indexOf(a));
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    lb.querySelector(".ols-lb__close").focus();
    document.addEventListener("keydown", onKey);
  }

  function close() {
    lb.classList.remove("is-open");
    lb.hidden = true;
    img.removeAttribute("src");
    document.documentElement.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "Tab") {
      var f = Array.prototype.filter.call(lb.querySelectorAll("button"), function (b) { return !b.hidden; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".ols-grid__item");
    if (a) open(a);
  });
})();
