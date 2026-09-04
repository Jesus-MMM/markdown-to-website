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

  function renderOneMermaid(container, source, index) {
    return ensureMermaid().then(function (mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: diagramTheme()
      });
      var id = "mmd-" + index + "-" + Math.random().toString(36).slice(2);
      return mermaid.render(id, source).then(function (res) {
        container.innerHTML = res.svg;
        container.classList.add("is-rendered");
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
        container.innerHTML = svg;
        container.classList.add("is-rendered");
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
