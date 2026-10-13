/* ============================================================
   OLS Photo Gallery – 6 Sections, Batch Pagination & Lightbox
   ============================================================ */
(function () {
  "use strict";

  var BATCH_SIZE = 10;

  // Determine base path for gallery assets
  var pathname = window.location.pathname || "";
  var basePath = "/gallery/";
  if (window.location.protocol === "file:") {
    basePath = "";
  } else if (pathname.indexOf("/gallery") === -1) {
    basePath = "gallery/";
  }

  var manifestUrl = basePath + "images.json";

  // Data & State
  var galleryManifest = { sections: [] };
  var sectionStates = {}; // key: sectionId -> { activeAlbum, renderedCount, albums }

  // Shared Lightbox State
  var lb = null;
  var lbImg = null;
  var lbCap = null;
  var lbSpin = null;
  var lbCloseBtn = null;
  var lbPrevBtn = null;
  var lbNextBtn = null;
  var lbActiveSectionId = "";
  var lbActiveAlbum = "";
  var lbActiveIndex = 0;
  var lastFocusedElement = null;

  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }

  function getThumbUrl(sectionId, albumName, filename) {
    return basePath + "thumbs/" + encodeURIComponent(sectionId) + "/" + encodeURIComponent(albumName) + "/" + filename;
  }

  function getFullUrl(sectionId, albumName, filename) {
    return basePath + "full/" + encodeURIComponent(sectionId) + "/" + encodeURIComponent(albumName) + "/" + filename;
  }

  /* ------------------------------------------------------------
     Lightbox Implementation
     ------------------------------------------------------------ */
  function buildLightbox() {
    if (lb) return;
    lb = document.createElement("div");
    lb.className = "ols-lb";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML =
      '<div class="ols-lb__spin" aria-hidden="true"></div>' +
      '<img class="ols-lb__img" alt="">' +
      '<button type="button" class="ols-lb__close" aria-label="Close photo">&times;</button>' +
      '<button type="button" class="ols-lb__prev" aria-label="Previous photo">&#8249;</button>' +
      '<button type="button" class="ols-lb__next" aria-label="Next photo">&#8250;</button>' +
      '<div class="ols-lb__cap" aria-live="polite"></div>';

    document.documentElement.appendChild(lb);

    lbImg = lb.querySelector(".ols-lb__img");
    lbCap = lb.querySelector(".ols-lb__cap");
    lbSpin = lb.querySelector(".ols-lb__spin");
    lbCloseBtn = lb.querySelector(".ols-lb__close");
    lbPrevBtn = lb.querySelector(".ols-lb__prev");
    lbNextBtn = lb.querySelector(".ols-lb__next");

    lbImg.addEventListener("load", function () {
      lb.classList.remove("is-loading");
    });
    lbImg.addEventListener("error", function () {
      lb.classList.remove("is-loading");
    });

    lbCloseBtn.addEventListener("click", closeLightbox);
    lbPrevBtn.addEventListener("click", function () { navigateLightbox(-1); });
    lbNextBtn.addEventListener("click", function () { navigateLightbox(1); });

    // Click outside backdrop to close
    lb.addEventListener("click", function (e) {
      if (e.target === lb) {
        closeLightbox();
      }
    });

    // Mobile swipe
    var touchStartX = null;
    lb.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    lb.addEventListener("touchend", function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        navigateLightbox(dx < 0 ? 1 : -1);
      }
      touchStartX = null;
    });
  }

  function showLightboxPhoto(index) {
    var state = sectionStates[lbActiveSectionId];
    if (!state) return;
    var images = state.albums[lbActiveAlbum] || [];
    if (!images.length) return;

    lbActiveIndex = (index + images.length) % images.length;
    var filename = images[lbActiveIndex];

    lb.classList.add("is-loading");
    lbImg.removeAttribute("src");
    lbImg.alt = lbActiveAlbum + " – photo " + (lbActiveIndex + 1);
    lbImg.src = getFullUrl(lbActiveSectionId, lbActiveAlbum, filename);

    lbCap.textContent = (lbActiveIndex + 1) + " / " + images.length;

    var hasMultiple = images.length > 1;
    lbPrevBtn.hidden = !hasMultiple;
    lbNextBtn.hidden = !hasMultiple;
  }

  function navigateLightbox(step) {
    showLightboxPhoto(lbActiveIndex + step);
  }

  function openLightbox(sectionId, albumName, photoIndex, triggerElement) {
    buildLightbox();
    lastFocusedElement = triggerElement || document.activeElement;

    lbActiveSectionId = sectionId;
    lbActiveAlbum = albumName;
    lbActiveIndex = photoIndex;

    lb.hidden = false;
    document.documentElement.style.overflow = "hidden";
    showLightboxPhoto(photoIndex);

    requestAnimationFrame(function () {
      lb.classList.add("is-open");
    });

    lbCloseBtn.focus();
    document.addEventListener("keydown", onLightboxKeyDown);
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.classList.remove("is-open");
    lb.hidden = true;
    if (lbImg) lbImg.removeAttribute("src");
    document.documentElement.style.overflow = "";
    document.removeEventListener("keydown", onLightboxKeyDown);
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function onLightboxKeyDown(e) {
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowRight") {
      navigateLightbox(1);
    } else if (e.key === "ArrowLeft") {
      navigateLightbox(-1);
    } else if (e.key === "Tab") {
      var focusable = [lbCloseBtn, lbPrevBtn, lbNextBtn].filter(function (btn) {
        return btn && !btn.hidden;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ------------------------------------------------------------
     Section Batch Rendering
     ------------------------------------------------------------ */
  function renderBatch(sectionId) {
    var state = sectionStates[sectionId];
    if (!state) return;

    var secEl = state.element;
    var gridContainer = secEl.querySelector(".ols-grid");
    var showMoreBtn = secEl.querySelector(".gallery-show-more");
    if (!gridContainer) return;

    var images = state.albums[state.activeAlbum] || [];
    var total = images.length;
    var nextCount = Math.min(state.renderedCount + BATCH_SIZE, total);

    var fragment = document.createDocumentFragment();

    for (var i = state.renderedCount; i < nextCount; i++) {
      (function (index) {
        var filename = images[index];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ols-grid__item";
        btn.dataset.index = index;
        btn.setAttribute("aria-label", state.activeAlbum + " – photo " + (index + 1));

        var img = document.createElement("img");
        img.src = getThumbUrl(sectionId, state.activeAlbum, filename);
        img.alt = state.activeAlbum + " – photo " + (index + 1);
        img.width = 400;
        img.height = 400;
        img.loading = "lazy";
        img.decoding = "async";

        btn.appendChild(img);

        btn.addEventListener("click", function () {
          openLightbox(sectionId, state.activeAlbum, index, btn);
        });

        fragment.appendChild(btn);
      })(i);
    }

    gridContainer.appendChild(fragment);
    state.renderedCount = nextCount;

    // Show more button visibility
    if (showMoreBtn) {
      if (state.renderedCount < total) {
        showMoreBtn.hidden = false;
      } else {
        showMoreBtn.hidden = true;
      }
    }
  }

  function switchAlbum(sectionId, albumName, shouldFocus) {
    var state = sectionStates[sectionId];
    if (!state) return;
    if (state.activeAlbum === albumName && state.renderedCount > 0) return;

    state.activeAlbum = albumName;
    state.renderedCount = 0;

    var secEl = state.element;
    var tabsContainer = secEl.querySelector(".ols-tabs");
    var gridContainer = secEl.querySelector(".ols-grid");

    // Update tab pills in this section
    if (tabsContainer) {
      var tabButtons = tabsContainer.querySelectorAll('button[role="tab"]');
      tabButtons.forEach(function (btn) {
        var isSelected = btn.dataset.album === albumName;
        btn.setAttribute("aria-selected", isSelected ? "true" : "false");
        btn.tabIndex = isSelected ? 0 : -1;
        if (isSelected && shouldFocus) {
          btn.focus();
        }
      });
    }

    // Reset grid view to first 10
    if (gridContainer) {
      gridContainer.innerHTML = "";
    }
    renderBatch(sectionId);
  }

  /* ------------------------------------------------------------
     Initialize Each Section
     ------------------------------------------------------------ */
  function initSection(secData) {
    var secId = secData.id;
    var secEl = document.querySelector('.ols-albums[data-section="' + secId + '"]');
    if (!secEl) return;

    var albums = secData.albums || {};
    var albumNames = Object.keys(albums);
    if (!albumNames.length) return;

    var firstAlbum = albumNames[0];

    sectionStates[secId] = {
      element: secEl,
      albums: albums,
      activeAlbum: firstAlbum,
      renderedCount: 0
    };

    var tabsContainer = secEl.querySelector(".ols-tabs");
    var showMoreBtn = secEl.querySelector(".gallery-show-more");

    // Setup tabs
    if (tabsContainer) {
      if (albumNames.length > 1) {
        tabsContainer.innerHTML = "";
        albumNames.forEach(function (albName, idx) {
          var count = (albums[albName] || []).length;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.role = "tab";
          btn.id = "tab-" + secId + "-" + slugify(albName);
          btn.dataset.album = albName;
          btn.setAttribute("aria-selected", idx === 0 ? "true" : "false");
          btn.tabIndex = idx === 0 ? 0 : -1;
          btn.innerHTML = albName + " <span>" + count + "</span>";

          btn.addEventListener("click", function () {
            switchAlbum(secId, albName, false);
          });

          tabsContainer.appendChild(btn);
        });

        // Arrow navigation between tabs in this section
        tabsContainer.addEventListener("keydown", function (e) {
          var tabButtons = Array.prototype.slice.call(tabsContainer.querySelectorAll('button[role="tab"]'));
          var currentIndex = tabButtons.findIndex(function (btn) {
            return btn.dataset.album === sectionStates[secId].activeAlbum;
          });
          if (currentIndex === -1) return;

          var delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (delta !== 0) {
            e.preventDefault();
            var nextIndex = (currentIndex + delta + tabButtons.length) % tabButtons.length;
            var nextAlb = tabButtons[nextIndex].dataset.album;
            switchAlbum(secId, nextAlb, true);
          }
        });
      } else {
        // Only 1 album in this section: hide the redundant tab pill
        tabsContainer.style.display = "none";
      }
    }

    // Setup Show More button for this section
    if (showMoreBtn) {
      showMoreBtn.addEventListener("click", function () {
        renderBatch(secId);
      });
    }

    // Render first batch of 10
    renderBatch(secId);
  }

  /* ------------------------------------------------------------
     Bootstrapping
     ------------------------------------------------------------ */
  function init() {
    fetch(manifestUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " loading " + manifestUrl);
        return res.json();
      })
      .then(function (data) {
        galleryManifest = data || { sections: [] };
        var sections = galleryManifest.sections || [];
        sections.forEach(function (secData) {
          initSection(secData);
        });
      })
      .catch(function (err) {
        console.error("Gallery initialization error:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
