/* =========================================================
   Parallaxe in den Bildrahmen

   Das Bild ist höher als sein Rahmen und wandert beim Scrollen
   darin. Entscheidend: Die Bewegung findet INNERHALB eines
   overflow:hidden-Rahmens statt. Sie kann deshalb grundsätzlich
   nichts überlagern und verändert kein Layout — anders als alles
   Angepinnte oder fest Positionierte.

   Ohne dieses Skript sitzt das Bild einfach ruhig im Rahmen; die
   Klasse .pf--on, die es überhaupt erst höher macht, wird hier
   gesetzt und nicht im HTML.
   ========================================================= */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  var frames = Array.prototype.slice.call(document.querySelectorAll(".pf"));
  if (!frames.length) return;

  /* Höchstauslenkung. Muss kleiner sein als die halbe Mehrhöhe aus der
     CSS (128 % → 14 %), sonst blitzt am Endanschlag der Rahmen durch. */
  var SPIELRAUM = 0.12;
  var sichtbar = [];
  var laeuft = 0;

  frames.forEach(function (frame) {
    frame.classList.add("pf--on");
  });

  function versetzen() {
    var mitte = window.innerHeight / 2;

    sichtbar.forEach(function (frame) {
      var box = frame.getBoundingClientRect();
      if (!box.height) return;

      /* Anteil zwischen -1 (Rahmen unten am Bildrand) und +1 (oben).
         Bezugsgröße ist die gesamte Strecke, die der Rahmen durch das
         Fenster zurücklegt — sonst ruckelt es bei großen Bildern. */
      var strecke = (window.innerHeight + box.height) / 2;
      var anteil = (mitte - (box.top + box.height / 2)) / strecke;
      if (anteil > 1) anteil = 1;
      if (anteil < -1) anteil = -1;

      var bild = frame.firstElementChild;
      if (!bild) return;
      bild.style.transform =
        "translate3d(0," + (anteil * SPIELRAUM * box.height).toFixed(2) + "px,0)";
    });

    laeuft = sichtbar.length ? window.requestAnimationFrame(versetzen) : 0;
  }

  function anstossen() {
    if (!laeuft && sichtbar.length) laeuft = window.requestAnimationFrame(versetzen);
  }

  /* Nur Rahmen im Blickfeld werden gerechnet. Ein Rahmen weit
     außerhalb kostet so keine einzige Bildwiederholung. */
  var beobachter = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (eintrag) {
      var stelle = sichtbar.indexOf(eintrag.target);
      if (eintrag.isIntersecting && stelle === -1) sichtbar.push(eintrag.target);
      if (!eintrag.isIntersecting && stelle > -1) sichtbar.splice(stelle, 1);
    });
    anstossen();
  }, { rootMargin: "15% 0px 15% 0px", threshold: 0 });

  frames.forEach(function (frame) { beobachter.observe(frame); });

  window.addEventListener("resize", anstossen, { passive: true });
})();
