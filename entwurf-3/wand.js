/* =========================================================
   Die Wand zum Selberstreichen

   Der Zeiger ist die Rolle. Seine Spur wird in eine SVG-Maske
   gezeichnet und legt dadurch die Farbfläche frei — Ursache und
   Wirkung sind zwangsläufig dieselbe Geometrie.

   Der Pinsel deckt bewusst NICHT sofort. Jeder Durchgang ist eine
   eigene halbdurchsichtige Lage aus drei Strichbreiten: breit und
   sehr blass außen, schmal und kräftiger innen. Dadurch ist der
   Rand weich, ein einzelner Zug deckt nur etwa ein Drittel, und
   erst mehrmaliges Überstreichen macht die Fläche voll. Genau so
   verhält sich Farbe — ein einziger volldeckender Strich ist das,
   was sich nach Malprogramm anfühlt.

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
  var rumpf     = document.getElementById("rumpf");
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

  /* Wandmaße — nur hier wird Deckung gezählt */
  var WAND = { x1: 40, x2: 270, y1: 24, y2: 240 };

  /* Ruheposition der Figur; alles Weitere ist relativ dazu */
  var BASIS_HAND = { x: 340, y: 172 };
  var REICHWEITE = { min: 26, max: 135 };

  /* Die drei Lagen eines Durchgangs: außen breit und blass,
     innen schmal und kräftiger. Ergibt einen weichen Rand ohne
     Weichzeichner — ein Filter müsste bei jedem Bild die ganze
     wachsende Spur neu rechnen und wird schnell teuer. */
  var LAGEN = [
    { breite: 34, deckung: 0.09 },
    { breite: 24, deckung: 0.13 },
    { breite: 15, deckung: 0.22 }
  ];
  var PAUSE_MS = 150;      // danach beginnt ein neuer Durchgang

  var ruhe = true;
  var fx = 0, fxZiel = 0, fxVorher = 0;
  var beinPhase = 0, schrittTempo = 0;
  var letzterPunkt = null;
  var letzteZeit = 0;
  var lagenPfade = [];     // die drei Pfade des laufenden Durchgangs
  var punkteImZug = 0;
  var fertigGezeigt = false;

  /* Deckung zählen: die Wand in Zellen teilen und je Durchgang
     höchstens einmal aufschlagen — sonst würde ein einziger
     langsamer Zug die Zelle mehrfach zählen. */
  var SP = 34, ZE = 26;
  var deckung = new Uint8Array(SP * ZE);
  var imZugBeruehrt = new Uint8Array(SP * ZE);
  var ZUWACHS = 88, VOLL = 176;

  maskeVoll.remove();
  svg.classList.add("malbar");

  /** Einen neuen Durchgang beginnen: drei frische Lagen. */
  function neuerZug() {
    var gruppe = document.createElementNS(NS, "g");
    lagenPfade = LAGEN.map(function (lage) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", "");
      p.setAttribute("stroke-width", lage.breite);
      p.setAttribute("stroke-opacity", lage.deckung);
      gruppe.appendChild(p);
      return p;
    });
    striche.appendChild(gruppe);
    punkteImZug = 0;
    imZugBeruehrt.fill(0);
  }
  neuerZug();

  function inSzene(clientX, clientY) {
    var k = svg.getBoundingClientRect();
    if (!k.width) return null;
    return { x: (clientX - k.left) * (BREITE / k.width),
             y: (clientY - k.top) * (HOEHE / k.height) };
  }

  function abdeckung(p) {
    var r = 13;
    var sx1 = Math.floor((p.x - r - WAND.x1) / (WAND.x2 - WAND.x1) * SP);
    var sx2 = Math.ceil((p.x + r - WAND.x1) / (WAND.x2 - WAND.x1) * SP);
    var sy1 = Math.floor((p.y - r - WAND.y1) / (WAND.y2 - WAND.y1) * ZE);
    var sy2 = Math.ceil((p.y + r - WAND.y1) / (WAND.y2 - WAND.y1) * ZE);
    for (var sy = Math.max(0, sy1); sy < Math.min(ZE, sy2); sy++) {
      for (var sx = Math.max(0, sx1); sx < Math.min(SP, sx2); sx++) {
        var i = sy * SP + sx;
        if (imZugBeruehrt[i]) continue;          // je Durchgang nur einmal
        imZugBeruehrt[i] = 1;
        deckung[i] = Math.min(255, deckung[i] + ZUWACHS);
      }
    }
    if (!fertigGezeigt) {
      var voll = 0;
      for (var i2 = 0; i2 < deckung.length; i2++) if (deckung[i2] >= VOLL) voll++;
      if (voll / deckung.length > 0.62) {
        fertigGezeigt = true;
        if (jubel) jubel.setAttribute("opacity", "1");
      }
    }
  }

  function malen(p) {
    var jetzt = performance.now();
    /* Nach einer Pause beginnt ein neuer Durchgang. Nur dadurch
       kann sich Farbe überhaupt aufbauen: Innerhalb eines Zuges
       ist die Lage gleichmäßig, erst die nächste legt nach. */
    if (jetzt - letzteZeit > PAUSE_MS || punkteImZug > 320) {
      neuerZug();
      letzterPunkt = null;
    }
    letzteZeit = jetzt;

    if (letzterPunkt) {
      var dx = p.x - letzterPunkt.x, dy = p.y - letzterPunkt.y;
      if (dx * dx + dy * dy < 6) return;
    }
    var teil = letzterPunkt ? " L" + p.x.toFixed(1) + " " + p.y.toFixed(1)
                            : "M" + p.x.toFixed(1) + " " + p.y.toFixed(1);
    for (var i = 0; i < lagenPfade.length; i++) {
      lagenPfade[i].setAttribute("d", lagenPfade[i].getAttribute("d") + teil);
    }
    punkteImZug++;
    letzterPunkt = p;
    abdeckung(p);
  }

  function ausrichten(p) {
    var handX = BASIS_HAND.x + fx;
    var abstand = handX - p.x;
    if (abstand > REICHWEITE.max) fxZiel = fx - (abstand - REICHWEITE.max);
    else if (abstand < REICHWEITE.min) fxZiel = fx + (REICHWEITE.min - abstand);
    fxZiel = Math.max(-296, Math.min(60, fxZiel));
  }

  function zeichnen() {
    fx += (fxZiel - fx) * 0.12;

    /* Das Gehen hängt an der EIGENEN Bewegung der Figur, nicht an
       der des Zeigers. Vorher ruderte sie mit den Beinen, während
       sie stand, weil die Schrittphase am Zeiger hing. */
    var dfx = fx - fxVorher;
    fxVorher = fx;
    var wunschTempo = Math.min(1, Math.abs(dfx) / 1.4);
    schrittTempo += (wunschTempo - schrittTempo) * 0.18;
    beinPhase += Math.abs(dfx) * 0.42;

    figur.setAttribute("transform", "translate(" + fx.toFixed(2) + " 0)");

    var schwung = Math.sin(beinPhase) * 17 * schrittTempo;
    var hueft = 352 + fx;
    if (beinL) beinL.setAttribute("transform", "rotate(" + schwung.toFixed(1) + " " + hueft.toFixed(1) + " 196)");
    if (beinR) beinR.setAttribute("transform", "rotate(" + (-schwung).toFixed(1) + " " + hueft.toFixed(1) + " 196)");
    /* Bei jedem Schritt federt der Oberkörper leicht — ohne das
       wirkt das Gehen wie Schweben. */
    if (rumpf) {
      var wippe = -Math.abs(Math.sin(beinPhase)) * 2.1 * schrittTempo;
      rumpf.setAttribute("transform", "translate(0 " + wippe.toFixed(2) + ")");
    }

    var hand = { x: BASIS_HAND.x + fx, y: BASIS_HAND.y };
    var ziel = letzterPunkt || { x: hand.x - 105, y: 120 };

    stange.setAttribute("x1", hand.x.toFixed(1));
    stange.setAttribute("y1", hand.y.toFixed(1));
    stange.setAttribute("x2", ziel.x.toFixed(1));
    stange.setAttribute("y2", ziel.y.toFixed(1));

    var winkel = Math.atan2(ziel.y - hand.y, ziel.x - hand.x) * 180 / Math.PI;
    rolle.setAttribute("x", (ziel.x - 7).toFixed(1));
    rolle.setAttribute("y", (ziel.y - 16).toFixed(1));
    rolle.setAttribute("transform", "rotate(" + winkel.toFixed(1) + " " + ziel.x.toFixed(1) + " " + ziel.y.toFixed(1) + ")");

    requestAnimationFrame(zeichnen);
  }
  requestAnimationFrame(zeichnen);

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
    if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
    letzterPunkt = null;
    ausEreignis(e);
  });
  svg.addEventListener("pointerleave", function () { letzterPunkt = null; });

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var taktId = 0;

  if (reset) {
    reset.addEventListener("click", function () {
      while (striche.firstChild) striche.removeChild(striche.firstChild);
      neuerZug();
      letzterPunkt = null;
      deckung = new Uint8Array(SP * ZE);
      fertigGezeigt = false;
      if (jubel) jubel.setAttribute("opacity", "0");
      if (hinweis) hinweis.classList.remove("ist-weg");
      ruhe = true;
      vorfuehren();
    });
  }

  /* --- Vorführung, solange niemand selbst malt --- */
  function vorfuehren() {
    if (taktId) { window.clearInterval(taktId); taktId = 0; }

    if (ruhig) {                       // keine Bewegung gewünscht: fertig zeigen
      for (var lauf = 0; lauf < 3; lauf++) {
        neuerZug();
        var d = "";
        for (var y = WAND.y1 + 20; y < WAND.y2; y += 20) {
          d += (d ? " L" : "M") + WAND.x1 + " " + y +
               " L" + WAND.x2 + " " + y + " L" + WAND.x2 + " " + (y + 10) +
               " L" + WAND.x1 + " " + (y + 10);
        }
        for (var i = 0; i < lagenPfade.length; i++) lagenPfade[i].setAttribute("d", d);
      }
      return;
    }

    var t = 0;
    taktId = window.setInterval(function () {
      if (!ruhe) { window.clearInterval(taktId); taktId = 0; return; }
      t += 0.016;
      var fortschritt = Math.min(1, t / 6);
      var x = WAND.x1 + 18 + (WAND.x2 - WAND.x1 - 36) * fortschritt;
      var y = 132 + Math.sin(t * 2.6) * 68;
      ausrichten({ x: x, y: y });
      malen({ x: x, y: y });
      if (fortschritt >= 1) { window.clearInterval(taktId); taktId = 0; }
    }, 32);
  }
  window.setTimeout(vorfuehren, 600);
})();
