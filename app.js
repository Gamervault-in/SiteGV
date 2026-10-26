/* GamerVault site behaviour. Plain JS, no dependencies. */
(function () {
  "use strict";
  var GV = window.GV || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function sget(k) { try { var s = store("sessionStorage"); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function sset(k, v) { try { var s = store("sessionStorage"); if (s) s.setItem(k, v); } catch (e) {} }

  /* ---------- mobile menu ---------- */
  var menuBtn = $(".menu-btn"), nav = $(".main-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus(); }
    });
  }

  /* ---------- copy buttons ---------- */
  $$("[data-copy-text]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy-text"), old = b.textContent;
      function ok() { b.textContent = "Copied"; setTimeout(function () { b.textContent = old; }, 1800); }
      function fail() { b.textContent = text; }
      try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
    });
  });

  /* ---------- modal helpers ---------- */
  var lastFocus = null;
  function openModal(m) {
    if (!m) return;
    lastFocus = document.activeElement;
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add("show"); });
    var f = m.querySelector(".close-x"); if (f) f.focus();
    document.body.style.overflow = "hidden";
  }
  function closeModal(m) {
    if (!m || m.hidden) return;
    m.classList.remove("show");
    setTimeout(function () { m.hidden = true; }, 200);
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("[data-close]")) closeModal(m); });
    m.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal(m);
      if (e.key === "Tab") {
        var f = $$("button:not([disabled]), a[href], input, select, textarea", m).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  });

  /* ---------- Inkling: card modal + session pop-up ---------- */
  var inkModal = $("#inkling-modal");
  $$("[data-inkling-open]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var popup = $("#inkling-popup"); if (popup && !popup.hidden) closePopup();
      openModal(inkModal);
    });
  });
  var popup = $("#inkling-popup");
  function closePopup() {
    if (!popup) return;
    popup.classList.remove("show");
    sset("gv-inkling-popup", "closed");
    setTimeout(function () { popup.hidden = true; }, 350);
  }
  if (popup && GV.inkling && GV.inkling.popupEnabled && !sget("gv-inkling-popup")) {
    setTimeout(function () {
      popup.hidden = false;
      requestAnimationFrame(function () { popup.classList.add("show"); });
      sset("gv-inkling-popup", "shown");
    }, 1600);
    popup.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closePopup(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !popup.hidden) closePopup(); });
  }
  /* informational 'Coming soon' buttons */
  $$("[data-coming-soon]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var note = b.parentNode.querySelector(".soon-note");
      if (note) { note.hidden = false; }
    });
  });

  /* ---------- catalogue filtering (games + articles) ---------- */
  function setupFilter(root) {
    var list = $("[data-list]", root);
    if (!list) return;
    var items = $$("[data-item]", list);
    var search = $("[data-search]", root);
    var chips = $$("[data-chip]", root);
    var selects = $$("select[data-filter]", root);
    var sort = $("select[data-sort]", root);
    var count = $("[data-count]", root);
    var empty = $("[data-empty]", root);
    var moreBtn = $("[data-more]", root);
    var reset = $$("[data-reset]", root);
    var pageSize = parseInt(list.getAttribute("data-page") || "12", 10);
    var shown = pageSize;
    var chipKey = chips.length ? chips[0].getAttribute("data-key") : null;
    var activeChip = "all";

    function norm(s) { return (s || "").toLowerCase(); }
    function apply(keepPage) {
      if (!keepPage) shown = pageSize;
      var q = norm(search && search.value).trim();
      var sel = {};
      selects.forEach(function (s) { sel[s.getAttribute("data-filter")] = s.value; });
      var matches = items.filter(function (it) {
        if (q && norm(it.getAttribute("data-text")).indexOf(q) === -1) return false;
        if (chipKey && activeChip !== "all" && it.getAttribute("data-" + chipKey) !== activeChip) return false;
        for (var k in sel) {
          if (!sel[k] || sel[k] === "all") continue;
          var v = it.getAttribute("data-" + k) || "";
          if (v.split("|").indexOf(sel[k]) === -1) return false;
        }
        return true;
      });
      if (sort) {
        var mode = sort.value;
        matches.sort(function (a, b) {
          if (mode === "az") return a.getAttribute("data-title").localeCompare(b.getAttribute("data-title"));
          if (mode === "newest") return b.getAttribute("data-date").localeCompare(a.getAttribute("data-date"));
          var fa = +a.getAttribute("data-featured"), fb = +b.getAttribute("data-featured");
          return fb - fa || b.getAttribute("data-date").localeCompare(a.getAttribute("data-date"));
        });
        matches.forEach(function (m) { list.appendChild(m); });
      }
      items.forEach(function (it) { it.hidden = true; });
      matches.forEach(function (m, i) { m.hidden = i >= shown; });
      if (count) count.textContent = matches.length === 1 ? "1 result" : matches.length + " results";
      if (empty) empty.hidden = matches.length !== 0;
      if (moreBtn) moreBtn.hidden = matches.length <= shown;
    }
    if (search) search.addEventListener("input", function () { apply(); });
    selects.forEach(function (s) { s.addEventListener("change", function () { apply(); }); });
    if (sort) sort.addEventListener("change", function () { apply(); });
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        activeChip = c.getAttribute("data-chip");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        apply();
      });
    });
    reset.forEach(function (r) {
      r.addEventListener("click", function () {
        if (search) search.value = "";
        selects.forEach(function (s) { s.value = "all"; });
        activeChip = "all";
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o.getAttribute("data-chip") === "all" ? "true" : "false"); });
        apply();
      });
    });
    if (moreBtn) moreBtn.addEventListener("click", function () {
      var loader = $("[data-loading]", root);
      moreBtn.hidden = true; if (loader) loader.hidden = false;
      setTimeout(function () { if (loader) loader.hidden = true; shown += pageSize; apply(true); }, 250);
    });
    /* allow ?q= and ?cat= in the URL */
    try {
      var params = new URLSearchParams(location.search);
      if (search && params.get("q")) search.value = params.get("q");
      var c = params.get("cat");
      if (c) chips.forEach(function (ch) { if (ch.getAttribute("data-chip") === c) { activeChip = c; } ch.setAttribute("aria-pressed", ch.getAttribute("data-chip") === activeChip ? "true" : "false"); });
    } catch (e) {}
    apply();
  }
  $$("[data-filter-root]").forEach(setupFilter);

  /* ---------- forms ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var URLRX = /^https?:\/\/[^\s.]+\.[^\s]{2,}/i;
  $$("form[data-form]").forEach(function (form) {
    var started = Date.now();
    var status = $(".form-status", form);
    var btn = $("button[type=submit]", form);
    function fieldOf(el) { return el.closest(".field") || el.closest("fieldset"); }
    function setErr(el, msg) {
      var f = fieldOf(el); if (!f) return;
      var e = $(".err", f);
      if (msg) { f.classList.add("invalid"); if (e) e.textContent = msg; el.setAttribute("aria-invalid", "true"); }
      else { f.classList.remove("invalid"); el.removeAttribute("aria-invalid"); }
    }
    function check(el) {
      var v = (el.value || "").trim();
      if (el.type === "checkbox" && el.hasAttribute("required")) { setErr(el, el.checked ? "" : "Please tick this box to continue."); return el.checked; }
      if (el.hasAttribute("required") && !v) { setErr(el, "This field is required."); return false; }
      if (v && el.type === "email" && !EMAIL.test(v)) { setErr(el, "Enter an email address like name@studio.com."); return false; }
      if (v && el.type === "url" && !URLRX.test(v)) { setErr(el, "Enter a full link starting with https://"); return false; }
      if (v && el.minLength > 0 && v.length < el.minLength) { setErr(el, "Please add a little more detail (at least " + el.minLength + " characters)."); return false; }
      setErr(el, ""); return true;
    }
    function checkGroups() {
      var ok = true;
      $$("fieldset[data-required-group]", form).forEach(function (fs) {
        var any = $$("input", fs).some(function (i) { return i.checked; });
        var e = $(".err", fs);
        fs.classList.toggle("invalid", !any);
        if (e) { e.textContent = any ? "" : "Choose at least one option."; e.style.display = any ? "none" : "block"; }
        if (!any) ok = false;
      });
      return ok;
    }
    $$("input, select, textarea", form).forEach(function (el) {
      el.addEventListener("blur", function () { if (el.value) check(el); });
      el.addEventListener("change", function () { if (fieldOf(el) && fieldOf(el).classList.contains("invalid")) check(el); });
    });
    function show(kind, title, msg) {
      status.className = "form-status show " + kind;
      status.innerHTML = "<b></b><span></span>";
      status.firstChild.textContent = title; status.lastChild.textContent = msg;
      status.setAttribute("tabindex", "-1"); status.focus({ preventScroll: false });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var els = $$("input:not(.hp input), select, textarea", form).filter(function (el) { return !el.closest(".hp"); });
      var ok = true, firstBad = null;
      els.forEach(function (el) { if (!check(el)) { ok = false; firstBad = firstBad || el; } });
      if (!checkGroups()) { ok = false; firstBad = firstBad || $("fieldset.invalid input", form); }
      if (!ok) { show("bad", "Please check the highlighted fields.", "A few details are missing or need fixing."); if (firstBad) firstBad.focus(); return; }
      var hp = $(".hp input", form);
      if ((hp && hp.value) || Date.now() - started < 2500) { show("bad", "That was quick.", "Please take a moment to review your details, then submit again."); return; }
      var endpoint = GV.formEndpoint;
      if (!endpoint) {
        show("warn", "Prototype form: nothing was sent.", "This form is not connected to a submission service yet. Please email " + (GV.email || "us") + " with these details instead.");
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k === "_gotcha") return; data[k] = data[k] ? data[k] + ", " + v : v; });
      data._subject = "GamerVault: " + (form.getAttribute("data-form") || "enquiry");
      data.form = form.getAttribute("data-form");
      btn.disabled = true; var label = btn.textContent; btn.textContent = "Sending...";
      fetch(endpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (!r.ok) throw new Error("status " + r.status);
          show("ok", form.getAttribute("data-success-title") || "Thank you. We have received your message.", form.getAttribute("data-success") || "We will reply by email.");
          form.reset(); started = Date.now();
        })
        .catch(function () {
          show("bad", "Your message could not be sent.", "Please try again in a moment, or email " + (GV.email || "us") + " directly.");
        })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });

  /* ---------- article table of contents ---------- */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { tocLinks.forEach(function (a) { a.classList.remove("active"); }); var a = map[en.target.id]; if (a) a.classList.add("active"); }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) io.observe(h); });
  }
})();
