/* =========================================================
   R&T Yilmaz Malerbetrieb — Interaktionen
   Kein Framework, keine externen Abhängigkeiten.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Jahreszahl im Footer ---------- */
  var jahr = document.getElementById("jahr");
  if (jahr) jahr.textContent = new Date().getFullYear();

  /* ---------- Mobiles Menü ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function closeNav() {
    if (!burger || !nav) return;
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Menü öffnen");
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      if (open) {
        closeNav();
      } else {
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", "Menü schließen");
        nav.classList.add("is-open");
        document.body.classList.add("nav-open");
      }
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------- Header: Schatten beim Scrollen ---------- */
  var header = document.getElementById("header");
  function onScroll() {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 12);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Aktiver Menüpunkt ---------- */
  var navLinks = nav ? nav.querySelectorAll('a[href^="#"]:not(.nav__cta)') : [];
  var sections = [];
  navLinks.forEach(function (link) {
    var el = document.querySelector(link.getAttribute("href"));
    if (el) sections.push({ link: link, el: el });
  });

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          sections.forEach(function (s) {
            s.link.classList.toggle("is-active", s.el === entry.target);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { spy.observe(s.el); });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveals = document.querySelectorAll(".reveal");

  function revealAll() {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    /* Das Verstecken wird erst hier eingeschaltet — von genau der Stelle,
       die es auch wieder aufhebt. Hinge es an der Klasse "js" aus dem
       <head>, würde eine veraltete oder fehlerhafte Fassung dieser Datei
       Inhalte dauerhaft unsichtbar machen, statt nur die Animation zu
       verlieren. Genau das ist in Entwurf 2 passiert. */
    document.documentElement.classList.add("reveal-on");

    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry, i) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          window.setTimeout(function () { el.classList.add("is-in"); }, Math.min(i, 5) * 70);
          obs.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) { io.observe(el); });

    // Notbremse: Falls der Observer aus irgendeinem Grund nicht auslöst,
    // wird nach 1,5 Sekunden einfach alles eingeblendet. Die Seite darf
    // unter keinen Umständen unsichtbar bleiben.
    window.setTimeout(function () {
      if (!document.querySelector(".reveal.is-in")) revealAll();
    }, 1500);
  }

  /* ---------- Vorher/Nachher-Regler ---------- */
  var box = document.getElementById("compare");
  var range = document.getElementById("compareRange");
  if (box && range) {
    var setPos = function () { box.style.setProperty("--pos", range.value + "%"); };
    setPos();
    range.addEventListener("input", setPos);
  }

  /* ---------- Kontaktformular ---------- */
  var form = document.getElementById("anfrage");
  var note = document.getElementById("formNote");
  var waBtn = document.getElementById("waBtn");

  var MAIL = "info@malerbetrieb-yilmaz.de";
  var WHATSAPP = "491787381857"; // 0178 7381857

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function say(text, kind) {
    if (!note) return;
    note.textContent = text;
    note.className = "form__note" + (kind ? " is-" + kind : "");
  }

  /** Prüft die Pflichtfelder und markiert Fehler. */
  function check() {
    if (!form) return false;

    // Spam-Falle: von Menschen nie ausgefüllt
    if (val("f-web") !== "") return false;

    var ok = true;
    var first = null;

    ["f-name", "f-tel", "f-text", "f-dsgvo"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var bad = el.type === "checkbox" ? !el.checked : el.value.trim() === "";
      el.classList.toggle("is-invalid", bad);
      if (bad && !first) first = el;
      if (bad) ok = false;
    });

    var mail = document.getElementById("f-mail");
    if (mail && mail.value.trim() !== "" && !mail.checkValidity()) {
      mail.classList.add("is-invalid");
      if (!first) first = mail;
      ok = false;
    }

    if (!ok) {
      say("Bitte füllen Sie Name, Telefon und Ihr Anliegen aus und bestätigen Sie den Datenschutz.", "error");
      if (first) first.focus();
    }
    return ok;
  }

  /** Baut den Nachrichtentext aus den Formularfeldern. */
  function buildText() {
    var lines = [
      "Name: " + val("f-name"),
      "Telefon: " + val("f-tel")
    ];
    if (val("f-mail")) lines.push("E-Mail: " + val("f-mail"));
    if (val("f-ort")) lines.push("PLZ / Ort: " + val("f-ort"));
    lines.push("Leistung: " + val("f-leistung"));
    lines.push("");
    lines.push(val("f-text"));
    return lines.join("\n");
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!check()) return;
      var betreff = "Anfrage über die Website – " + val("f-leistung");
      window.location.href =
        "mailto:" + MAIL +
        "?subject=" + encodeURIComponent(betreff) +
        "&body=" + encodeURIComponent(buildText());
      say("Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht. Bitte dort noch auf „Senden“ klicken.", "ok");
    });

    form.addEventListener("input", function (e) {
      if (e.target.classList) e.target.classList.remove("is-invalid");
    });
  }

  if (waBtn) {
    waBtn.addEventListener("click", function () {
      if (!check()) return;
      var text = "Anfrage über die Website\n\n" + buildText();
      window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      say("WhatsApp öffnet sich mit der fertigen Nachricht.", "ok");
    });
  }
})();
