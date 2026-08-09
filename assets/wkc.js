/* ============================================================
   WizKidsCarnival — shared behaviour
   Loaded by index.html, kpl/index.html, lcl/index.html.

   Every block is null-guarded: one file serves all three pages,
   and a page that lacks an element simply skips that block.

   Pages declare their identity before this file loads:
     <script>window.WKC = { page:'kpl', program:'kpl' };</script>
   ============================================================ */
(function () {
  'use strict';

  var WKC = window.WKC || {};
  var PAGE = WKC.page || 'home';

  /* ── Outbound destinations ────────────────────────────────
     hrefs are ALSO written literally in the HTML so the site works
     with JS off. This map exists for analytics + UTM decoration.
     NOTE: `app` is the generic Login/Register target — change here. */
  var LINKS = {
    app:       'https://app.wizkidscarnival.com/authentication',
    kpl:       'https://app.wizkidscarnival.com/kpl',
    lcl:       'https://app.wizkidscarnival.com/lcl',
    showcases: 'https://showcases.wizkidscarnival.com/',
    results:   'https://app.wizkidscarnival.com/result-list',
    magazine:  'https://app.wizkidscarnival.com/magazines'
  };
  window.WKC_LINKS = LINKS;

  /* ── Analytics — unified wrapper for GA4 + Mixpanel ────── */
  var analytics = {
    ga4: function (name, params) {
      try { if (window.gtag) window.gtag('event', name, params); } catch (e) {}
    },
    mp: function (name, props) {
      try { if (window.mixpanel && window.mixpanel.track) window.mixpanel.track(name, props); } catch (e) {}
    },
    track: function (name, props) {
      var payload = Object.assign({ page: PAGE, url: location.href }, props || {});
      this.ga4(name, payload);
      this.mp(name, payload);
    }
  };
  window.wkcAnalytics = analytics;

  var qs = new URLSearchParams(location.search);
  analytics.track('page_landed', {
    referrer:     document.referrer || 'direct',
    utm_source:   qs.get('utm_source') || '',
    utm_medium:   qs.get('utm_medium') || '',
    utm_campaign: qs.get('utm_campaign') || ''
  });

  /* ── Scroll depth ─────────────────────────────────────── */
  var marks = { 25: false, 50: false, 75: false, 90: false };
  window.addEventListener('scroll', function () {
    var denom = Math.max(1, document.body.scrollHeight - window.innerHeight);
    var pct = Math.round((window.scrollY / denom) * 100);
    [25, 50, 75, 90].forEach(function (m) {
      if (!marks[m] && pct >= m) { marks[m] = true; analytics.track('scroll_depth', { depth: m }); }
    });
  }, { passive: true });

  /* ── Section viewed ───────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.target.dataset.section) {
          analytics.track('section_viewed', { section: e.target.dataset.section });
          sectionObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('[data-section]').forEach(function (el) { sectionObs.observe(el); });
  }

  /* ── Marquee duplication (seamless loop) ──────────────── */
  ['ttrack', 'logoTrack'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML += el.innerHTML;
  });

  /* ── Nav shadow on scroll ─────────────────────────────── */
  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ── Mobile menu ──────────────────────────────────────── */
  var ham      = document.getElementById('navHam');
  var overlay  = document.getElementById('navOverlay');
  var closeBtn = document.getElementById('navClose');
  if (ham && overlay) {
    var openMenu = function () {
      overlay.classList.add('open');
      ham.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = overlay.querySelector('a, button');
      if (first) first.focus();
    };
    var closeMenu = function () {
      overlay.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      ham.focus();
    };
    ham.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    overlay.querySelectorAll('.ol').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
    });
  }

  /* ── Click tracking ───────────────────────────────────── */
  document.querySelectorAll('[data-nav]').forEach(function (el) {
    el.addEventListener('click', function () { analytics.track('nav_click', { label: el.dataset.nav }); });
  });
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { analytics.track('link_click', { target: el.dataset.track }); });
  });

  /* ── Smooth scroll for in-page anchors ────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href === '#') return;
      var t = document.querySelector(href);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ── Sticky mobile CTA ────────────────────────────────
     Hidden while the hero is on screen (the hero already carries a
     CTA) and again once the footer arrives (so it can't cover the
     footer links). Replaces the old observer that watched the lead
     form, which no longer exists. */
  var sticky = document.getElementById('stickyBar');
  if (sticky && 'IntersectionObserver' in window) {
    var hero = document.querySelector('.hero, .page-hero');
    var foot = document.querySelector('.footer');
    var over = { hero: false, foot: false };
    var sync = function () {
      sticky.classList.toggle('form-visible', over.hero || over.foot);
    };
    var watch = function (el, key) {
      if (!el) return;
      new IntersectionObserver(function (entries) {
        over[key] = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(el);
    };
    watch(hero, 'hero');
    watch(foot, 'foot');
  }

  /* ── FAQ accordion (kpl / lcl) — single open at a time ── */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentElement;
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (i) {
        i.classList.remove('open');
        var btn = i.querySelector('.faq-q');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
