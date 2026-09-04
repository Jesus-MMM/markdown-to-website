/* ============================================================
   Modern Docs — main.js
   Theme toggle · Sidebar search · Copy code · Mobile sidebar
   Diagrams (Mermaid + Graphviz/DOT) — lazy, per-diagram
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Theme toggle ---------------- */
  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") || "light";
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      if (renderedDiagrams.length) rerenderDiagrams();
    });
  }

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById("footerYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Mobile sidebar ---------------- */
  var sidebarToggle = document.getElementById("sidebarToggle");
  var sidebar = document.querySelector(".sidebar");
  var backdrop = null;

  function ensureBackdrop() {
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", closeSidebar);
    }
    return backdrop;
  }
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    sidebarToggle && sidebarToggle.setAttribute("aria-expanded", "true");
    ensureBackdrop().classList.add("is-visible");
    document.addEventListener("keydown", onKeyEsc);
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    sidebarToggle && sidebarToggle.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.classList.remove("is-visible");
    document.removeEventListener("keydown", onKeyEsc);
  }
  function onKeyEsc(e) { if (e.key === "Escape") closeSidebar(); }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
    });
  }
  // Close on nav click (mobile)
  if (sidebar) {
    sidebar.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width: 768px)").matches && e.target.closest("a")) {
        closeSidebar();
      }
    });
  }

  /* ---------------- Sidebar search filter ---------------- */
  function setupSearch(inputEl) {
    if (!inputEl) return;
    var navScroll = document.getElementById("navScroll");
    var navEmpty = document.getElementById("navEmpty");
    if (!navScroll) return;

    inputEl.addEventListener("input", function () {
      var q = inputEl.value.trim().toLowerCase();
      navScroll.setAttribute("data-filtering", q ? "true" : "false");

      var items = navScroll.querySelectorAll(".nav-menu > li");
      var anyVisible = false;

      items.forEach(function (li) {
        var links = li.querySelectorAll("a");
        var hasMatch = false;
        links.forEach(function (a) {
          var text = (a.textContent || "").toLowerCase();
          var href = (a.getAttribute("href") || "").toLowerCase();
          var match = !q || text.indexOf(q) !== -1 || href.indexOf(q) !== -1;
          a.parentElement.style.display = match ? "" : "none";
          if (match) hasMatch = true;
        });

        // Group label visibility: show if any descendant matches
        var span = li.querySelector(":scope > span");
        if (span) {
          li.style.display = hasMatch ? "" : "none";
          if (hasMatch) anyVisible = true;
        } else if (links.length) {
          // direct link item (no group)
          li.style.display = hasMatch ? "" : "none";
          if (hasMatch) anyVisible = true;
        } else {
          li.style.display = "none";
        }
      });

      if (navEmpty) navEmpty.hidden = anyVisible;
    });
  }

  setupSearch(document.getElementById("navSearch"));
  setupSearch(document.getElementById("navSearchMobile"));

  /* ---------------- Keyboard "/" focuses search ---------------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    var target = document.getElementById("navSearch") ||
                 document.getElementById("navSearchMobile");
    if (target) target.focus();
  });

  /* ============================================================
     Diagramas — Mermaid y Graphviz (DOT)
     Renderizado en cliente, bajo demanda:
       · Solo se cargan librerías si la página tiene diagramas.
       · Cada diagrama se renderiza de forma independiente.
       · Un error en un diagrama no rompe el resto de la página.
       · El código fuente se conserva como respaldo ante fallos.

     El HTML generado por el pipeline tiene la forma:
       Mermaid: <div class="diagram diagram-mermaid"><pre class="mermaid">…
       DOT:     <div class="diagram diagram-dot" data-diagram-type="dot">
                  <pre class="diagram-source dot"><code class="language-dot">…
     ============================================================ */

  var DIAGRAM_MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  var DIAGRAM_GRAPHVIZ_CDN = "https://cdn.jsdelivr.net/npm/@hpcc-js/wasm-graphviz/+esm";

  // Promesas cacheadas: cada librería se importa una única vez por página.
  var mermaidModPromise = null;
  var graphvizModPromise = null;

  // Registro de diagramas encontrados para poder re-renderizarlos al cambiar
  // de tema sin depender del DOM original (que se sustituye por el SVG).
  var renderedDiagrams = [];

  // Contador global para nombres de descarga únicos.
  var diagramCounter = 0;

  function diagramTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "default";
  }

  function ensureMermaid() {
    if (!mermaidModPromise) {
      mermaidModPromise = import(DIAGRAM_MERMAID_CDN).then(function (mod) {
        return mod.default || mod;
      });
    }
    return mermaidModPromise;
  }

  function ensureGraphviz() {
    if (!graphvizModPromise) {
      graphvizModPromise = import(DIAGRAM_GRAPHVIZ_CDN).then(function (mod) {
        return mod;
      });
    }
    return graphvizModPromise;
  }

  function showDiagramError(container, type, err) {
    container.classList.add("has-error");
    var msgEl = document.createElement("div");
    msgEl.className = "diagram-error";
    msgEl.setAttribute("role", "alert");
    msgEl.textContent = "Error renderizando diagrama " + type +
      (err && err.message ? ": " + err.message : "");
    container.appendChild(msgEl);
  }

  /* ------------------------------------------------------------
     Controles de diagrama: zoom, pan (mover) y descarga.
     Cada SVG se monta dentro de una vista con toolbar:
       .diagram
         .diagram-toolbar  (botones + / − / reset / descargar)
         .diagram-viewport (clip + apunta al área visible)
           .diagram-canvas (se le aplica translate + scale)
             <svg>
     ------------------------------------------------------------ */

  var DIAGRAM_ZOOM_STEP = 1.25;
  var DIAGRAM_ZOOM_MIN = 0.2;
  var DIAGRAM_ZOOM_MAX = 8;

  function makeToolbar() {
    var bar = document.createElement("div");
    bar.className = "diagram-toolbar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Controles del diagrama");

    var buttons = [
      { action: "zoom-in", label: "Acercar", html: "+" },
      { action: "zoom-out", label: "Alejar", html: "&#8722;" },
      { action: "reset", label: "Restablecer vista", html: "&#8635;" },
      { action: "download", label: "Descargar SVG", html: "&#8681;" },
    ];
    buttons.forEach(function (b) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "diagram-btn";
      btn.dataset.action = b.action;
      btn.innerHTML = b.html;
      btn.title = b.label;
      btn.setAttribute("aria-label", b.label);
      bar.appendChild(btn);
    });
    return bar;
  }

  function mountDiagram(container, svg, filename) {
    container.classList.add("is-rendered");
    container.innerHTML = "";

    var bar = makeToolbar();
    var viewport = document.createElement("div");
    viewport.className = "diagram-viewport";
    var canvas = document.createElement("div");
    canvas.className = "diagram-canvas";

    // El svg llega como string; lo convertimos a un nodo DOM real.
    var svgEl = stringToSvg(svg);
    canvas.appendChild(svgEl);
    viewport.appendChild(canvas);
    container.appendChild(bar);
    container.appendChild(viewport);

    var hint = document.createElement("div");
    hint.className = "diagram-hint";
    hint.textContent = "Arrastra para mover · rueda para zoom";
    viewport.appendChild(hint);

    var state = { zoom: 1, tx: 0, ty: 0, dragging: false, dragX: 0, dragY: 0 };

    function applyTransform() {
      canvas.style.transform =
        "translate(" + state.tx + "px," + state.ty + "px) scale(" + state.zoom + ")";
    }

    function zoomTo(newZoom, px, py, byButton) {
      var prev = state.zoom;
      state.zoom = Math.max(DIAGRAM_ZOOM_MIN, Math.min(DIAGRAM_ZOOM_MAX, newZoom));
      var ratio = state.zoom / prev;
      var r = viewport.getBoundingClientRect();
      // El punto pivote: centro del viewport para los botones, cursor para la rueda.
      var cx = byButton ? r.width / 2 : px - r.left;
      var cy = byButton ? r.height / 2 : py - r.top;
      state.tx = cx - (cx - state.tx) * ratio;
      state.ty = cy - (cy - state.ty) * ratio;
      applyTransform();
    }

    function zoomIn() { zoomTo(state.zoom * DIAGRAM_ZOOM_STEP, 0, 0, true); }
    function zoomOut() { zoomTo(state.zoom / DIAGRAM_ZOOM_STEP, 0, 0, true); }
    function reset() {
      state.zoom = 1; state.tx = 0; state.ty = 0;
      applyTransform();
    }
    function download() {
      var out = /xmlns=/.test(svg) ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      var blob = new Blob([out], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".diagram-btn");
      if (!btn) return;
      if (btn.dataset.action === "zoom-in") zoomIn();
      else if (btn.dataset.action === "zoom-out") zoomOut();
      else if (btn.dataset.action === "reset") reset();
      else if (btn.dataset.action === "download") download();
    });

    // Zoom con la rueda del ratón (Ctrl/meta para evitar conflicto con el scroll
    // normal de la página; también activo con wheel normal dentro del diagrama).
    viewport.addEventListener("wheel", function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? DIAGRAM_ZOOM_STEP : 1 / DIAGRAM_ZOOM_STEP;
      zoomTo(state.zoom * factor, e.clientX, e.clientY, false);
    }, { passive: false });

    // Pan con el ratón.
    viewport.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      state.dragging = true;
      state.dragX = e.clientX - state.tx;
      state.dragY = e.clientY - state.ty;
      viewport.classList.add("is-panning");
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!state.dragging) return;
      state.tx = e.clientX - state.dragX;
      state.ty = e.clientY - state.dragY;
      applyTransform();
    });

    document.addEventListener("mouseup", function () {
      if (!state.dragging) return;
      state.dragging = false;
      viewport.classList.remove("is-panning");
      document.body.style.userSelect = "";
    });

    return svgEl;
  }

  // Convierte una cadena SVG a un elemento DOM y normaliza sus dimensiones:
  // usa el viewBox para fijar un tamaño natural en píxeles y elimina cualquier
  // style inline que fuerce un ancho (p. ej. max-width de Mermaid). Así el
  // canvas de zoom/pan recibe un SVG con tamaño real y se puede desplazar.
  function stringToSvg(str) {
    var doc = new DOMParser().parseFromString(str, "image/svg+xml");
    var svg = doc.documentElement;
    svg.removeAttribute("style");
    var vb = svg.getAttribute("viewBox");
    if (vb) {
      var parts = vb.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 &&
          parts.every(function (n) { return isFinite(n); })) {
        if (!/^\d+(\.\d+)?(px)?$/.test(svg.getAttribute("width") || "") ||
            !/^\d+(\.\d+)?(px)?$/.test(svg.getAttribute("height") || "")) {
          svg.setAttribute("width", String(parts[2]));
          svg.setAttribute("height", String(parts[3]));
        }
      }
    }
    return svg;
  }

  function renderOneMermaid(container, source, index) {
    return ensureMermaid().then(function (mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: diagramTheme()
      });
      var id = "mmd-" + index + "-" + Math.random().toString(36).slice(2);
      return mermaid.render(id, source).then(function (res) {
        var name = "mermaid-" + (++diagramCounter) + ".svg";
        mountDiagram(container, res.svg, name);
      }).catch(function (err) {
        showDiagramError(container, "Mermaid", err);
      });
    }).catch(function (err) {
      showDiagramError(container, "Mermaid", err);
    });
  }

  function renderOneDot(container, source) {
    return ensureGraphviz().then(function (mod) {
      return mod.Graphviz.load().then(function (graphviz) {
        var svg = graphviz.dot(source);
        var name = "dot-" + (++diagramCounter) + ".svg";
        mountDiagram(container, svg, name);
      }).catch(function (err) {
        showDiagramError(container, "Graphviz", err);
      });
    }).catch(function (err) {
      showDiagramError(container, "Graphviz", err);
    });
  }

  function processDiagrams() {
    var index = 0;
    document.querySelectorAll(".diagram.diagram-mermaid pre.mermaid").forEach(function (pre) {
      var container = pre.parentElement;
      var source = pre.innerText;
      renderedDiagrams.push({ container: container, type: "mermaid", source: source });
      renderOneMermaid(container, source, index++);
    });

    document.querySelectorAll(".diagram.diagram-dot .diagram-source").forEach(function (pre) {
      var container = pre.parentElement;
      var source = pre.innerText;
      renderedDiagrams.push({ container: container, type: "dot", source: source });
      renderOneDot(container, source);
    });
  }

  function rerenderDiagrams() {
    var index = 0;
    renderedDiagrams.forEach(function (d) {
      d.container.innerHTML = "";
      d.container.classList.remove("is-rendered", "has-error");
      if (d.type === "mermaid") renderOneMermaid(d.container, d.source, index++);
      else renderOneDot(d.container, d.source);
    });
  }

  processDiagrams();

  /* ---------------- Copy code button ---------------- */
  var COPY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  function addCopyButtons() {
    var pres = document.querySelectorAll(".content pre");
    pres.forEach(function (pre) {
      // No añadir botón a los diagramas (su <pre> se sustituye por SVG).
      if (pre.closest(".diagram")) return;
      if (pre.querySelector(".copy-btn")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.innerHTML = COPY_ICON + "<span>Copy</span>";
      btn.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = code ? code.innerText : pre.innerText;
        copyText(text).then(function () {
          btn.classList.add("copied");
          btn.innerHTML = CHECK_ICON + "<span>Copied</span>";
          setTimeout(function () {
            btn.classList.remove("copied");
            btn.innerHTML = COPY_ICON + "<span>Copy</span>";
          }, 2000);
        }).catch(function () {
          btn.classList.add("copied");
          btn.innerHTML = CHECK_ICON + "<span>Copied</span>";
          setTimeout(function () {
            btn.classList.remove("copied");
            btn.innerHTML = COPY_ICON + "<span>Copy</span>";
          }, 2000);
        });
      });
      pre.appendChild(btn);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject();
      } catch (err) { reject(err); }
    });
  }

  addCopyButtons();

  /* ---------------- Active link on URL hash/click ---------------- */
  function syncActiveLink() {
    var navLinks = document.querySelectorAll(".nav-menu a");
    var currentHash = (window.location.hash || "").toLowerCase();
    var currentPath = window.location.pathname.toLowerCase();
    navLinks.forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      var isActive = (!currentHash && href === currentPath) ||
                     (currentHash && href === currentHash) ||
                     (currentHash && href.indexOf(currentHash) !== -1);
      a.classList.toggle("active", isActive);
    });
  }
  syncActiveLink();
  window.addEventListener("hashchange", syncActiveLink);
})();
