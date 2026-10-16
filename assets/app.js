/* RaghusLogicLab — shared helpers used by every page */
(function () {
  "use strict";

  var DRAFT_KEY = "rll_draft_v1";

  var STATUS = {
    live:     { label: "Live",        cls: "s-live",     color: "#34d399" },
    beta:     { label: "Beta",        cls: "s-beta",     color: "#22d3ee" },
    progress: { label: "In Progress", cls: "s-progress", color: "#fbbf24" },
    idea:     { label: "Idea",        cls: "s-idea",     color: "#a78bfa" },
    paused:   { label: "Paused",      cls: "s-paused",   color: "#94a3b8" }
  };

  var UPDATE_TYPES = {
    update: "Update", launch: "Launch", feature: "New feature", fix: "Fix", idea: "Idea", note: "Note"
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      var d = raw ? JSON.parse(raw) : null;
      /* Drafts saved before the Tools section existed: keep the published tools list */
      if (d && !d.tools) d.tools = (window.RLL_DATA && window.RLL_DATA.tools) ? clone(window.RLL_DATA.tools) : [];
      return d;
    } catch (e) { return null; }
  }
  function saveDraft(data) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function published() {
    var d = window.RLL_DATA || {};
    d.site = d.site || {};
    d.projects = d.projects || [];
    d.updates = d.updates || [];
    d.tools = d.tools || [];
    return clone(d);
  }

  /* Public pages: show your unpublished draft (only in YOUR browser) so you can preview. */
  function load() {
    var draft = readDraft();
    if (draft && draft.projects) return { data: draft, isDraft: true };
    return { data: published(), isDraft: false };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function slugify(s) {
    return String(s || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function initials(name) {
    var parts = String(name || "?").replace(/\(.*?\)/g, "").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function statusBadge(key) {
    var s = STATUS[key] || STATUS.idea;
    return '<span class="badge ' + s.cls + '">' + s.label + "</span>";
  }

  function projectLink(site, slug) {
    var path = "project.html?p=" + encodeURIComponent(slug);
    var base = (site && site.baseUrl || "").trim().replace(/\/+$/, "");
    if (base) return base + "/" + path;
    try { return new URL(path, location.href).href; } catch (e) { return path; }
  }

  function publicProjects(data) {
    return data.projects.filter(function (p) { return p.visibility !== "unlisted"; });
  }

  function publicTools(data) {
    return (data.tools || []).filter(function (t) { return t.visibility !== "unlisted"; });
  }

  function sortedUpdates(data) {
    return data.updates.slice().sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });
  }

  function iconHtml(p, size) {
    var st = size ? ' style="background:' + esc(p.color || "#22d3ee") + ";width:" + size + "px;height:" + size + 'px"' :
      ' style="background:' + esc(p.color || "#22d3ee") + '"';
    return '<div class="p-icon"' + st + ">" + esc(initials(p.name)) + "</div>";
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* Two-click confirm (browser pop-ups are blocked in some viewers) */
  function confirmClick(btn, fn) {
    if (btn.dataset.armed === "1") { fn(); return; }
    btn.dataset.armed = "1";
    btn._label = btn.textContent;
    btn.textContent = "Click again to confirm";
    btn.classList.add("armed");
    setTimeout(function () {
      if (!btn.isConnected) return;
      btn.dataset.armed = ""; btn.textContent = btn._label; btn.classList.remove("armed");
    }, 3500);
  }

  function currentSlug() {
    var q = new URLSearchParams(location.search).get("p");
    if (q) return q;
    return decodeURIComponent((location.hash || "").slice(1));
  }

  function copy(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else { fallback(); }
    toast("Link copied");
  }

  /* ---------- Header with the Projects dropdown ---------- */
  function renderHeader(data, active, isDraft) {
    var el = document.getElementById("site-header");
    if (!el) return;
    var site = data.site || {};
    var projects = publicProjects(data);
    var items = projects.length ? projects.map(function (p) {
      var s = STATUS[p.status] || STATUS.idea;
      return '<a href="project.html?p=' + encodeURIComponent(p.slug) + '"><span class="dot" style="background:' + s.color + '"></span>' +
        '<span>' + esc(p.name) + '</span></a>';
    }).join("") : '<div class="dd-empty">No projects yet</div>';

    var tools = publicTools(data);
    var toolItems = tools.length ? tools.map(function (t) {
      return '<a href="' + esc(t.url) + '"><span class="dot" style="background:' + esc(t.color || "#22d3ee") + '"></span>' +
        '<span>' + esc(t.name) + '</span></a>';
    }).join("") : '<div class="dd-empty">No tools yet</div>';

    var name = esc(site.name || "RaghusLogicLab");
    var styledName = name.replace(/Logic/, "<b>Logic</b>");

    el.innerHTML =
      (isDraft ? '<div class="draft-banner">Preview mode — you are seeing unpublished changes saved in this browser. ' +
        '<a href="admin.html#publish">Publish them</a> to make them visible to customers.</div>' : "") +
      '<div class="wrap nav">' +
        '<a class="brand" href="index.html"><span class="brand-mark">RL</span><span>' + styledName + "</span></a>" +
        '<button class="nav-toggle" aria-label="Menu" aria-expanded="false">&#9776;</button>' +
        '<ul class="nav-links">' +
          '<li><a href="index.html" class="' + (active === "home" ? "active" : "") + '">Home</a></li>' +
          '<li class="dropdown" id="projects-dd">' +
            '<button type="button" aria-haspopup="true" aria-expanded="false" class="' + (active === "projects" ? "active" : "") + '">Projects <span class="caret">&#9660;</span></button>' +
            '<div class="dropdown-menu" role="menu">' +
              '<a class="dd-create" href="admin.html#create">+ Create Project</a>' +
              '<div class="dd-sep"></div>' +
              '<div class="dd-label">Our projects</div>' + items +
              '<div class="dd-sep"></div>' +
              '<a href="index.html#projects">View all projects &rarr;</a>' +
            "</div>" +
          "</li>" +
          '<li class="dropdown" id="tools-dd">' +
            '<button type="button" aria-haspopup="true" aria-expanded="false" class="' + (active === "tools" ? "active" : "") + '">Tools <span class="caret">&#9660;</span></button>' +
            '<div class="dropdown-menu" role="menu">' +
              '<div class="dd-label">Free tools</div>' + toolItems +
              '<div class="dd-sep"></div>' +
              '<a href="index.html#tools">View all tools &rarr;</a>' +
            "</div>" +
          "</li>" +
          '<li><a href="index.html#lab-log">Lab Log</a></li>' +
          '<li><a href="index.html#about">About</a></li>' +
          '<li><a href="index.html#contact">Contact</a></li>' +
        "</ul>" +
      "</div>";

    var dds = Array.prototype.slice.call(el.querySelectorAll(".dropdown"));
    function closeAll(except) {
      dds.forEach(function (d) {
        if (d === except) return;
        d.classList.remove("open"); d.querySelector("button").setAttribute("aria-expanded", "false");
      });
    }
    dds.forEach(function (dd) {
      var ddBtn = dd.querySelector("button");
      ddBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeAll(dd);
        var open = dd.classList.toggle("open");
        ddBtn.setAttribute("aria-expanded", open);
      });
    });
    document.addEventListener("click", function (e) {
      dds.forEach(function (dd) { if (!dd.contains(e.target)) { dd.classList.remove("open"); dd.querySelector("button").setAttribute("aria-expanded", "false"); } });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll(null);
    });

    var toggle = el.querySelector(".nav-toggle");
    var links = el.querySelector(".nav-links");
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); closeAll(null); });
    });
  }

  function renderFooter(data) {
    var el = document.getElementById("site-footer");
    if (!el) return;
    var site = data.site || {};
    var ups = sortedUpdates(data);
    var last = ups.length ? fmtDate(ups[0].date) : "";
    el.innerHTML = '<div class="wrap">' +
      "<span>&copy; " + new Date().getFullYear() + " " + esc(site.name || "RaghusLogicLab") + ". Built one day at a time.</span>" +
      "<span>" + (last ? "Last lab update: " + esc(last) + " &middot; " : "") + '<a href="admin.html">Project Studio</a></span>' +
      "</div>";
  }

  window.RLL = {
    STATUS: STATUS, UPDATE_TYPES: UPDATE_TYPES,
    load: load, published: published, readDraft: readDraft, saveDraft: saveDraft, clearDraft: clearDraft,
    esc: esc, slugify: slugify, initials: initials, fmtDate: fmtDate, today: today,
    statusBadge: statusBadge, projectLink: projectLink, publicProjects: publicProjects, publicTools: publicTools,
    sortedUpdates: sortedUpdates, iconHtml: iconHtml, toast: toast, copy: copy,
    renderHeader: renderHeader, renderFooter: renderFooter, clone: clone,
    confirmClick: confirmClick, currentSlug: currentSlug
  };
})();
