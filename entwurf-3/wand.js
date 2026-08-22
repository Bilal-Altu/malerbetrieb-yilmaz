/* =========================================================
   Die Wand zum Selberstreichen

   Wie in echt gerollt wird, und was daraus folgt:

   Eine Farbrolle ist ein Zylinder fester Länge. Sie hinterlässt
   einen Streifen mit GERADEN Kanten, genau so breit wie sie selbst
   — keine Schlangenlinie mit runden Enden. Deshalb wird hier nicht
   die Zeigerspur als Linie gezeichnet, sondern die Rollenfläche
   entlang der Bewegung gestempelt: ein achsparalleles Rechteck je
   Schritt. Fährt man senkrecht, entsteht eine saubere Bahn in
   Rollenbreite; fährt man waagerecht, ein Streifen in Rollenhöhe.
   Beides mit geraden Kanten, so wie eine Rolle es hinterlässt.

   Zwei Dinge, die dabei zwingend sind:
   - Zwischen zwei Zeigermeldungen wird interpoliert. Sonst reißt
     die Bahn bei schneller Bewegung in einzelne Klötzchen auf.
   - Alle Stempel eines Durchgangs liegen in EINEM Pfad. Überlappende
     Teilflächen eines Pfades vereinigen sich, statt sich zu
     addieren — nur so bleibt ein Zug gleichmäßig gedeckt.

   Farbe deckt nicht sofort: Ein Durchgang sind drei Lagen, außen
   groß und blass, innen kleiner und kräftiger. Das ergibt weiche
   Ränder, und erst mehrmaliges Überrollen macht die Fläche voll.

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

  var WAND = { x1: 60, x2: 280, y1: 58, y2: 240 };

  var BASIS_HAND = { x: 340, y: 172 };
  var REICHWEITE = { min: 30, max: 140 };

  /* Die Rolle ist 34 breit und 12 hoch — dieselben Maße wie das
     Bild der Rolle in der Zeichnung. Die Lagen darum herum sind
     etwas größer und blasser und geben den weichen Rand. */
  var ROLLE = { b: 34, h: 12 };
  var LAGEN = [
    { zu: 5, deckung: 0.08 },   // zu = wieviel größer als die Rolle
    { zu: 2, deckung: 0.12 },
    { zu: 0, deckung: 0.21 }
  ];
  var SCHRITT = 4;          // Abstand der Stempel entlang der Bewegung
  var PAUSE_MS = 150;       // danach beginnt ein neuer Durchgang

  var ruhe = true;
  var fx = 0, fxZiel = 0, fxVorher = 0;
  var beinPhase = 0, schrittTempo = 0;
  var letzterPunkt = null;
  var letzteZeit = 0;
  var lagenPfade = [];
  var lagenD = [];
  var stempelImZug = 0;
  var fertigGezeigt = false;

  var SP = 34, ZE = 26;
  var deckung = new Uint8Array(SP * ZE);
  var imZugBeruehrt = new Uint8Array(SP * ZE);
  var ZUWACHS = 86, VOLL = 172;

  maskeVoll.remove();
  svg.classList.add("malbar");

  function neuerZug() {
    var gruppe = document.createElementNS(NS, "g");
    lagenPfade = [];
    lagenD = [];
    LAGEN.forEach(function (lage) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", "");
      p.setAttribute("fill-opacity", lage.deckung);
      gruppe.appendChild(p);
      lagenPfade.push(p);
      lagenD.push("");
    });
    striche.appendChild(gruppe);
    stempelImZug = 0;
    imZugBeruehrt.fill(0);
  }
  neuerZug();

  function inSzene(clientX, clientY) {
    var k = svg.getBoundingClientRect();
    if (!k.width) return null;
    return { x: (clientX - k.left) * (BREITE / k.width),
             y: (clientY - k.top) * (HOEHE / k.height) };
  }

  /** Einen Abdruck der Rolle setzen — drei Lagen, gleicher Mittelpunkt. */
  function stempeln(x, y) {
    for (var i = 0; i < LAGEN.length; i++) {
      var b = ROLLE.b + LAGEN[i].zu * 2;
      var h = ROLLE.h + LAGEN[i].zu * 2;
      lagenD[i] += "M" + (x - b / 2).toFixed(1) + " " + (y - h / 2).toFixed(1) +
                   "h" + b.toFixed(1) + "v" + h.toFixed(1) + "h" + (-b).toFixed(1) + "z";
    }
    stempelImZug++;
  }

  function abdeckung(x, y) {
    var rx = ROLLE.b / 2, ry = ROLLE.h / 2;
    var sx1 = Math.floor((x - rx - WAND.x1) / (WAND.x2 - WAND.x1) * SP);
    var sx2 = Math.ceil((x + rx - WAND.x1) / (WAND.x2 - WAND.x1) * SP);
    var sy1 = Math.floor((y - ry - WAND.y1) / (WAND.y2 - WAND.y1) * ZE);
    var sy2 = Math.ceil((y + ry - WAND.y1) / (WAND.y2 - WAND.y1) * ZE);
    for (var sy = Math.max(0, sy1); sy < Math.min(ZE, sy2); sy++) {
      for (var sx = Math.max(0, sx1); sx < Math.min(SP, sx2); sx++) {
        var i = sy * SP + sx;
        if (imZugBeruehrt[i]) continue;
        imZugBeruehrt[i] = 1;
        deckung[i] = Math.min(255, deckung[i] + ZUWACHS);
      }
    }
  }

  function fertigPruefen() {
    if (fertigGezeigt) return;
    var voll = 0;
    for (var i = 0; i < deckung.length; i++) if (deckung[i] >= VOLL) voll++;
    if (voll / deckung.length > 0.6) {
      fertigGezeigt = true;
      if (jubel) jubel.setAttribute("opacity", "1");
    }
  }

  function malen(p) {
    var jetzt = performance.now();
    if (jetzt - letzteZeit > PAUSE_MS || stempelImZug > 900) {
      neuerZug();
      letzterPunkt = null;
    }
    letzteZeit = jetzt;

    if (!letzterPunkt) {
      stempeln(p.x, p.y);
      abdeckung(p.x, p.y);
    } else {
      /* Zwischen den Meldungen interpolieren — sonst reißt die Bahn
         bei schneller Bewegung in einzelne Klötzchen auf. */
      var dx = p.x - letzterPunkt.x, dy = p.y - letzterPunkt.y;
      var strecke = Math.sqrt(dx * dx + dy * dy);
      if (strecke < 1) return;
      var schritte = Math.max(1, Math.ceil(strecke / SCHRITT));
      for (var s = 1; s <= schritte; s++) {
        var t = s / schritte;
        var x = letzterPunkt.x + dx * t;
        var y = letzterPunkt.y + dy * t;
        stempeln(x, y);
        abdeckung(x, y);
      }
    }
    for (var i = 0; i < lagenPfade.length; i++) lagenPfade[i].setAttribute("d", lagenD[i]);
    letzterPunkt = p;
    fertigPruefen();
  }

  function ausrichten(p) {
    var handX = BASIS_HAND.x + fx;
    var abstand = handX - p.x;
    if (abstand > REICHWEITE.max) fxZiel = fx - (abstand - REICHWEITE.max);
    else if (abstand < REICHWEITE.min) fxZiel = fx + (REICHWEITE.min - abstand);
    fxZiel = Math.max(-286, Math.min(60, fxZiel));
  }

  function zeichnen() {
    fx += (fxZiel - fx) * 0.12;

    /* Das Gehen hängt an der eigenen Bewegung der Figur, nicht an der
       des Zeigers — sonst rudert sie im Stand mit den Beinen. */
    var dfx = fx - fxVorher;
    fxVorher = fx;
    var wunsch = Math.min(1, Math.abs(dfx) / 1.4);
    schrittTempo += (wunsch - schrittTempo) * 0.18;
    beinPhase += Math.abs(dfx) * 0.42;

    figur.setAttribute("transform", "translate(" + fx.toFixed(2) + " 0)");

    var schwung = Math.sin(beinPhase) * 17 * schrittTempo;
    var hueft = 352 + fx;
    if (beinL) beinL.setAttribute("transform", "rotate(" + schwung.toFixed(1) + " " + hueft.toFixed(1) + " 196)");
    if (beinR) beinR.setAttribute("transform", "rotate(" + (-schwung).toFixed(1) + " " + hueft.toFixed(1) + " 196)");
    if (rumpf) {
      var wippe = -Math.abs(Math.sin(beinPhase)) * 2.1 * schrittTempo;
      rumpf.setAttribute("transform", "translate(0 " + wippe.toFixed(2) + ")");
    }

    var hand = { x: BASIS_HAND.x + fx, y: BASIS_HAND.y };
    var ziel = letzterPunkt || { x: hand.x - 110, y: 130 };

    /* Die Stange endet an der Unterkante der Rolle, nicht in ihrer
       Mitte — sonst steckt der Stiel mitten im Zylinder. */
    stange.setAttribute("x1", hand.x.toFixed(1));
    stange.setAttribute("y1", hand.y.toFixed(1));
    stange.setAttribute("x2", ziel.x.toFixed(1));
    stange.setAttribute("y2", (ziel.y + ROLLE.h / 2).toFixed(1));

    /* Die Rolle bleibt waagerecht. Ein Rollenbügel ist drehbar; die
       Rolle mitzudrehen sähe aus wie ein Zeiger, nicht wie Werkzeug. */
    rolle.setAttribute("x", (ziel.x - ROLLE.b / 2).toFixed(1));
    rolle.setAttribute("y", (ziel.y - ROLLE.h / 2).toFixed(1));

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

  /* --- Vorführung: senkrechte Bahnen, wie man wirklich rollt --- */
  function vorfuehren() {
    if (taktId) { window.clearInterval(taktId); taktId = 0; }

    if (ruhig) {
      for (var lauf = 0; lauf < 3; lauf++) {
        neuerZug();
        for (var x = WAND.x1 + 16; x < WAND.x2; x += 24) {
          for (var y = WAND.y1 + 20; y < WAND.y2 - 6; y += SCHRITT) stempeln(x, y);
        }
        for (var i = 0; i < lagenPfade.length; i++) lagenPfade[i].setAttribute("d", lagenD[i]);
      }
      return;
    }

    /* Senkrecht auf und ab, dabei langsam nach rechts — genau der
       Weg, den man mit einer Rolle an der Wand nimmt. */
    var t = 0;
    taktId = window.setInterval(function () {
      if (!ruhe) { window.clearInterval(taktId); taktId = 0; return; }
      t += 0.032;
      var fortschritt = Math.min(1, t / 7);
      var x = WAND.x1 + 20 + (WAND.x2 - WAND.x1 - 40) * fortschritt;
      var mitte = (WAND.y1 + WAND.y2) / 2;
      var y = mitte + Math.sin(t * 3.4) * ((WAND.y2 - WAND.y1) / 2 - 22);
      ausrichten({ x: x, y: y });
      malen({ x: x, y: y });
      if (fortschritt >= 1) { window.clearInterval(taktId); taktId = 0; }
    }, 32);
  }
  window.setTimeout(vorfuehren, 600);
})();
