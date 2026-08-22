/* =========================================================
   Die Wand zum Selberstreichen

   Der Zeiger ist die Rolle. Seine Spur wird als dicker Strich in
   eine SVG-Maske gezeichnet; dadurch wird die Farbfläche genau
   dort freigelegt, wo der Zeiger war. Ursache und Wirkung sind so
   zwangsläufig deckungsgleich — das war der Fehler der vorherigen
   Fassung, in der ein Rechteck unabhängig vom Arm hochwuchs.

   Ohne dieses Skript bleibt die Vollfläche in der Maske stehen und
   die Wand ist einfach fertig gestrichen. Nie eine leere Wand.
   ========================================================= */
(function () {
  "use strict";

  var svg = document.getElementById("szene");
  if (!svg) return;

  var maskeVoll = document.getElementById("maskeVoll");
  var striche   = document.getElementById("striche");
  var figur     = document.getElementById("figur");
  var stange    = document.getElementById("stange");
  var rolle     = document.getElementById("rolle");
  var beinL     = document.getElementById("beinL");
  var beinR     = document.getElementById("beinR");
  var jubel     = document.getElementById("jubel");
  var hinweis   = document.getElementById("wandHinweis");
  var reset     = document.getElementById("wandReset");
  if (!maskeVoll || !striche || !figur || !stange || !rolle) return;

  var NS = "http://www.w3.org/2000/svg";
  var BREITE = 460, HOEHE = 260;

  /* Maße der Wand — nur hier wird Farbe gezählt */
  var WAND = { x1: 28, x2: 300, y1: 28, y2: 240 };

  /* Ruheposition der Figur; alles Weitere ist relativ dazu */
  var BASIS_HAND = { x: 340, y: 172 };
  var REICHWEITE = { min: 26, max: 135 };

  var ruhe = true;              // noch keine echte Eingabe
  var fx = 0;                   // waagerechte Verschiebung der Figur
  var fxZiel = 0;
  var beinPhase = 0;
  var letzterPunkt = null;
  var aktuellerPfad = null;
  var punkteImPfad = 0;
  var fertigGezeigt = false;

  /* Abdeckung grob zählen: die Wand in Zellen teilen und merken,
     welche schon Farbe gesehen haben. Genau genug für ein "Fertig!". */
  var SP = 34, ZE = 24;
  var zellen = new Uint8Array(SP * ZE);
  var gezaehlt = 0;

  /* --- Grundzustand: Vollfläche raus, ab jetzt entscheidet die Spur --- */
  maskeVoll.remove();
  svg.classList.add("malbar");

  function neuerPfad() {
    aktuellerPfad = document.createElementNS(NS, "path");
    aktuellerPfad.setAttribute("d", "");
    striche.appendChild(aktuellerPfad);
    punkteImPfad = 0;
  }
  neuerPfad();

  /** Bildschirmkoordinaten in das Koordinatensystem der Zeichnung. */
  function inSzene(clientX, clientY) {
    var k = svg.getBoundingClientRect();
    if (!k.width) return null;
    return { x: (clientX - k.left) * (BREITE / k.width),
             y: (clientY - k.top) * (HOEHE / k.height) };
  }

  /** Zellen unter dem Pinsel als gestrichen vermerken. */
  function abdeckung(p) {
    var r = 14;
    var sx1 = Math.floor((p.x - r - WAND.x1) / (WAND.x2 - WAND.x1) * SP);
    var sx2 = Math.ceil((p.x + r - WAND.x1) / (WAND.x2 - WAND.x1) * SP);
    var sy1 = Math.floor((p.y - r - WAND.y1) / (WAND.y2 - WAND.y1) * ZE);
    var sy2 = Math.ceil((p.y + r - WAND.y1) / (WAND.y2 - WAND.y1) * ZE);
    for (var sy = Math.max(0, sy1); sy < Math.min(ZE, sy2); sy++) {
      for (var sx = Math.max(0, sx1); sx < Math.min(SP, sx2); sx++) {
        var i = sy * SP + sx;
        if (!zellen[i]) { zellen[i] = 1; gezaehlt++; }
      }
    }
    if (!fertigGezeigt && gezaehlt / (SP * ZE) > 0.72) {
      fertigGezeigt = true;
      if (jubel) jubel.setAttribute("opacity", "1");
    }
  }

  /** Einen Punkt an die Spur anhängen. */
  function malen(p) {
    if (letzterPunkt) {
      var dx = p.x - letzterPunkt.x, dy = p.y - letzterPunkt.y;
      if (dx * dx + dy * dy < 9) return;        // zu kleine Schritte überspringen
    }
    var d = aktuellerPfad.getAttribute("d");
    aktuellerPfad.setAttribute("d", d ? d + " L" + p.x.toFixed(1) + " " + p.y.toFixed(1)
                                      : "M" + p.x.toFixed(1) + " " + p.y.toFixed(1));
    punkteImPfad++;
    /* Ein Pfad wird irgendwann teuer. Nach 500 Punkten einen neuen
       anfangen und den alten stehen lassen — die Maske bleibt gleich. */
    if (punkteImPfad > 500) {
      neuerPfad();
      aktuellerPfad.setAttribute("d", "M" + p.x.toFixed(1) + " " + p.y.toFixed(1));
      punkteImPfad = 1;
    }
    if (letzterPunkt) beinPhase += Math.abs(p.x - letzterPunkt.x);
    letzterPunkt = p;
    abdeckung(p);
  }

  /** Figur, Stange und Rolle auf den Zeiger ausrichten. */
  function ausrichten(p) {
    /* Der Maler bleibt rechts vom Zeiger und geht mit, wenn die
       Stange sonst zu lang oder zu kurz würde. */
    var handX = BASIS_HAND.x + fx;
    var abstand = handX - p.x;
    if (abstand > REICHWEITE.max) fxZiel = fx - (abstand - REICHWEITE.max);
    else if (abstand < REICHWEITE.min) fxZiel = fx + (REICHWEITE.min - abstand);
    fxZiel = Math.max(-292, Math.min(58, fxZiel));
  }

  function zeichnen() {
    fx += (fxZiel - fx) * 0.12;
    figur.setAttribute("transform", "translate(" + fx.toFixed(2) + " 0)");

    var hand = { x: BASIS_HAND.x + fx, y: BASIS_HAND.y };
    var ziel = letzterPunkt || { x: hand.x - 100, y: 120 };

    stange.setAttribute("x1", hand.x.toFixed(1));
    stange.setAttribute("y1", hand.y.toFixed(1));
    stange.setAttribute("x2", ziel.x.toFixed(1));
    stange.setAttribute("y2", ziel.y.toFixed(1));

    var winkel = Math.atan2(ziel.y - hand.y, ziel.x - hand.x) * 180 / Math.PI;
    rolle.setAttribute("x", (ziel.x - 7).toFixed(1));
    rolle.setAttribute("y", (ziel.y - 16).toFixed(1));
    rolle.setAttribute("transform", "rotate(" + winkel.toFixed(1) + " " + ziel.x.toFixed(1) + " " + ziel.y.toFixed(1) + ")");

    /* Beine schwingen mit der zurückgelegten Strecke */
    var s = Math.sin(beinPhase / 14) * 13;
    if (beinL) beinL.setAttribute("transform", "rotate(" + s.toFixed(1) + " " + (352 + fx).toFixed(1) + " 196)");
    if (beinR) beinR.setAttribute("transform", "rotate(" + (-s).toFixed(1) + " " + (352 + fx).toFixed(1) + " 196)");

    requestAnimationFrame(zeichnen);
  }
  requestAnimationFrame(zeichnen);

  /* --- Eingaben --- */
  function ausEreignis(e) {
    var p = inSzene(e.clientX, e.clientY);
    if (!p) return;
    if (ruhe) {
      ruhe = false;
      if (hinweis) hinweis.classList.add("ist-weg");
    }
    ausrichten(p);
    malen(p);
  }

  svg.addEventListener("pointermove", function (e) {
    /* Auf dem Handy erst beim Wischen malen, sonst würde schon das
       Scrollen über die Wand alles einfärben. */
    if (e.pointerType !== "mouse" && e.buttons === 0) return;
    ausEreignis(e);
  });
  svg.addEventListener("pointerdown", function (e) {
    svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
    ausEreignis(e);
  });
  svg.addEventListener("pointerleave", function () { letzterPunkt = null; });

  if (reset) {
    reset.addEventListener("click", function () {
      while (striche.firstChild) striche.removeChild(striche.firstChild);
      neuerPfad();
      letzterPunkt = null;
      zellen = new Uint8Array(SP * ZE);
      gezaehlt = 0;
      fertigGezeigt = false;
      if (jubel) jubel.setAttribute("opacity", "0");
      if (hinweis) hinweis.classList.remove("ist-weg");
      ruhe = true;
      vorfuehren();
    });
  }

  /* --- Vorführung, solange niemand selbst malt ---
     Ohne sie stünde beim Laden eine graue, unfertige Wand da. Sie
     hört sofort auf, sobald jemand den Zeiger bewegt. */
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var taktId = 0;

  function vorfuehren() {
    if (ruhig) {                       // keine Bewegung gewünscht: fertig zeigen
      var d = "M" + WAND.x1 + " " + (WAND.y1 + 14);
      for (var y = WAND.y1 + 14; y < WAND.y2; y += 22) {
        d += " L" + WAND.x2 + " " + y + " L" + WAND.x2 + " " + (y + 11) +
             " L" + WAND.x1 + " " + (y + 11) + " L" + WAND.x1 + " " + (y + 22);
      }
      aktuellerPfad.setAttribute("d", d);
      return;
    }
    /* Einen noch laufenden Takt zuerst beenden — sonst malen nach
       mehrmaligem Zuruecksetzen mehrere Vorfuehrungen gleichzeitig. */
    if (taktId) window.clearInterval(taktId);
    var t = 0;
    taktId = window.setInterval(function () {
      if (!ruhe) { window.clearInterval(taktId); taktId = 0; return; }
      t += 0.016;
      /* Schlangenlinie über die Wand */
      var fortschritt = Math.min(1, t / 7);
      var x = WAND.x1 + 16 + (WAND.x2 - WAND.x1 - 32) * fortschritt;
      var y = 120 + Math.sin(t * 2.4) * 62;
      ausrichten({ x: x, y: y });
      malen({ x: x, y: y });
      if (fortschritt >= 1) { window.clearInterval(taktId); taktId = 0; }
    }, 32);
  }
  window.setTimeout(vorfuehren, 600);
})();
