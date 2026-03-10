/* ============================================================
   marketing.js — Scroll-reveal animations & mobile nav toggle
   ============================================================ */

(function () {
  'use strict';

  /* ── Scroll Reveal ─────────────────────────────────────────── */
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((el) => observer.observe(el));
  } else {
    /* Fallback: reveal everything immediately */
    revealElements.forEach((el) => el.classList.add('reveal--revealed'));
  }

  /* ── Nav Scroll Effect ─────────────────────────────────────── */
  const nav = document.getElementById('site-nav');
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('site-nav--scrolled', window.scrollY > 40);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile Nav Toggle ─────────────────────────────────────── */
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('site-nav__links--open');
      toggle.classList.toggle('site-nav__toggle--open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
    });

    /* Close mobile menu when a link is clicked */
    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('site-nav__links--open');
        toggle.classList.remove('site-nav__toggle--open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();
