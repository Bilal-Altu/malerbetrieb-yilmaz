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
  var armFrei   = document.getElementById("armFrei");
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
  var beinPhase = 0, schrittTempo = 0, blickZiel = -1;
  var letzterPunkt = null;   // letzter GEMALTER Punkt (null = Pinsel abgehoben)
  var rollePos = null;       // wo die Rolle steht, auch wenn gerade nicht gemalt wird
  var letzteRichtung = null;
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

  /* Nur die Wand ist streichbar: Rechteck plus Giebeldreieck.
     Am PC feuert pointermove auch ohne gedrueckte Taste — ohne diese
     Pruefung malt dort jede Mausbewegung ueber Figur, Eimer und Text,
     die Figur rennt dem Zeiger bis an den Rand hinterher und die Rolle
     schwebt ueber dem Nichts. Auf dem Handy faellt das nicht auf, weil
     dort nur beim Wischen gemalt wird. */
  function imWand(p) {
    if (p.x < 60 || p.x > 280 || p.y > 240) return false;
    if (p.y >= 132) return true;
    if (p.y < 58) return false;
    var t = (133 - p.y) / (133 - 58);
    return Math.abs(p.x - 170) <= 110 * (1 - t);
  }

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
    /* Neuer Durchgang bei Pause, bei Richtungsumkehr und bevor ein
       Pfad zu gross wird. Die Umkehr ist wichtig: Am PC faehrt man
       ohne abzusetzen hin und her — ohne sie bliebe das ein einziger
       Zug und die Farbe wuerde nie dichter. */
    var umkehr = false;
    if (letzterPunkt && letzteRichtung) {
      var rx = p.x - letzterPunkt.x, ry = p.y - letzterPunkt.y;
      var rl = Math.sqrt(rx * rx + ry * ry);
      if (rl > 2) {
        umkehr = (rx / rl) * letzteRichtung.x + (ry / rl) * letzteRichtung.y < -0.25;
      }
    }
    if (jetzt - letzteZeit > PAUSE_MS || umkehr || stempelImZug > 700) {
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
    if (letzterPunkt) {
      var mx = p.x - letzterPunkt.x, my = p.y - letzterPunkt.y;
      var ml = Math.sqrt(mx * mx + my * my);
      if (ml > 2) letzteRichtung = { x: mx / ml, y: my / ml };
    }
    letzterPunkt = p;
    rollePos = p;
    fertigPruefen();
  }

  function ausrichten(p) {
    var handX = BASIS_HAND.x + fx;
    var abstand = handX - p.x;
    if (abstand > REICHWEITE.max) fxZiel = fx - (abstand - REICHWEITE.max);
    else if (abstand < REICHWEITE.min) fxZiel = fx + (REICHWEITE.min - abstand);
    fxZiel = Math.max(-286, Math.min(60, fxZiel));
  }

  /* =========================================================
     Der Gangzyklus

     Vorher pendelten zwei starre Stöcke um die Hüfte. Das ist eine
     Schere, kein Gang: kein Knie, kein Abheben, die Füße schleifen
     dauernd am Boden — der Grund, warum es nach Schweben aussah.

     Jetzt hat jedes Bein Oberschenkel und Unterschenkel. Vorgegeben
     wird nur die Fußbahn; das Knie ergibt sich daraus rückwärts
     (Zweigelenk-Kinematik: Schnittpunkt zweier Kreise um Hüfte und
     Fuß). Die Fußbahn hat zwei Abschnitte, wie beim echten Gehen:

       Standphase (60 % des Zyklus): Der Fuß bleibt am Boden stehen
       und wandert relativ zum Körper nach hinten — der Körper
       schiebt sich über ihn hinweg.
       Schwungphase (40 %): Der Fuß hebt ab, schwingt nach vorn und
       setzt wieder auf.

     Das zweite Bein läuft eine halbe Periode versetzt. Der Körper
     federt zweimal je Zyklus: hoch im Einbeinstand, tief beim
     Aufsetzen. Der freie Arm schwingt gegenläufig zum Bein.
     ========================================================= */
  var OBERSCHENKEL = 24, UNTERSCHENKEL = 24;
  var BODEN = 44;               // Abstand Hüfte -> Boden
  /* Damit der Standfuß nicht schleift, MUSS gelten:
     Schrittlänge = Fußweg in der Standphase / Standanteil
     = 24 / 0,6 = 40. Bei 27 wanderte der Körper langsamer als der
     Fuß relativ zu ihm — genau das ergibt den Mondgang. */
  var SCHRITTLAENGE = 40;
  var blick = -1;               // -1 = nach links gewandt

  /** Fußposition relativ zur Hüfte für einen Zyklusanteil p. */
  function fussBahn(p, staerke) {
    var weite = 12 * staerke, hub = 8 * staerke;
    if (p < 0.6) {                         // Standphase: Fuß bleibt liegen
      var s = p / 0.6;
      return { x: weite - 2 * weite * s, y: BODEN };
    }
    var s2 = (p - 0.6) / 0.4;              // Schwungphase: Fuß hebt ab
    return { x: -weite + 2 * weite * s2,
             y: BODEN - hub * Math.sin(Math.PI * s2) };
  }

  /** Knie aus Hüfte und Fuß zurückrechnen. */
  function kniePunkt(fx2, fy2) {
    var d = Math.sqrt(fx2 * fx2 + fy2 * fy2) || 0.001;
    var dd = Math.min(d, OBERSCHENKEL + UNTERSCHENKEL - 0.01);
    var a = (dd * dd + OBERSCHENKEL * OBERSCHENKEL - UNTERSCHENKEL * UNTERSCHENKEL) / (2 * dd);
    var h = Math.sqrt(Math.max(0, OBERSCHENKEL * OBERSCHENKEL - a * a));
    var ux = fx2 / d, uy = fy2 / d;
    /* Das Knie wird zur Blickrichtung hin ausgelenkt — sonst knickt
       das Bein nach hinten weg wie bei einem Vogel. */
    return { x: ux * a - uy * h, y: uy * a + ux * h };
  }

  /** Ein Bein zeichnen: Hüfte -> Knie -> Fuß. */
  function beinZeichnen(gruppe, hueftX, hueftY, p, staerke, versatz) {
    if (!gruppe) return;
    var pfad = gruppe.firstElementChild;
    if (!pfad) return;
    var f = fussBahn(p, staerke);
    var fx2 = f.x * blick + versatz;
    var fy2 = f.y;
    var k = kniePunkt(fx2, fy2);
    pfad.setAttribute("d",
      "M" + hueftX.toFixed(1) + " " + hueftY.toFixed(1) +
      " L" + (hueftX + k.x).toFixed(1) + " " + (hueftY + k.y).toFixed(1) +
      " L" + (hueftX + fx2).toFixed(1) + " " + (hueftY + fy2).toFixed(1));
    gruppe.removeAttribute("transform");
  }

  function zeichnen() {
    fx += (fxZiel - fx) * 0.12;

    /* Das Gehen hängt an der eigenen Bewegung der Figur, nicht an der
       des Zeigers — sonst rudert sie im Stand mit den Beinen. */
    var dfx = fx - fxVorher;
    fxVorher = fx;
    var wunsch = Math.min(1, Math.abs(dfx) / 1.4);
    schrittTempo += (wunsch - schrittTempo) * 0.18;
    beinPhase += Math.abs(dfx);

    figur.setAttribute("transform", "translate(" + fx.toFixed(2) + " 0)");
    /* Die Blase liegt ausserhalb der Figur, damit sie zuoberst
       zeichnet — sie braucht deshalb dieselbe Verschiebung. */
    if (jubel) {
      var jx = Math.max(-280, Math.min(60, fx));
      jubel.setAttribute("transform", "translate(" + jx.toFixed(2) + " 0)");
    }

    /* Blickrichtung weich nachziehen, sonst kippt der Gang bei jedem
       Richtungswechsel schlagartig um. */
    if (Math.abs(dfx) > 0.05) blickZiel = dfx > 0 ? 1 : -1;
    blick += (blickZiel - blick) * 0.12;

    /* WICHTIG: Beine und Arm sitzen INNERHALB der bereits um fx
       verschobenen Figur. Ihre Koordinaten sind deshalb die
       unverschobenen. Vorher stand hier 352 + fx — der Drehpunkt
       wanderte also doppelt so schnell davon wie die Figur selbst. */
    var hueftX = 352, hueftY = 196;
    var p = (beinPhase / SCHRITTLAENGE) % 1;
    if (p < 0) p += 1;
    beinZeichnen(beinL, hueftX, hueftY, p, schrittTempo, -5);
    beinZeichnen(beinR, hueftX, hueftY, (p + 0.5) % 1, schrittTempo, 5);

    if (rumpf) {
      /* Hoch im Einbeinstand, tief beim Aufsetzen — zweimal je Zyklus. */
      var wippe = -2 * Math.abs(Math.sin(2 * Math.PI * p)) * schrittTempo;
      rumpf.setAttribute("transform", "translate(0 " + wippe.toFixed(2) + ")");
    }
    if (armFrei) {
      var armSchwung = -Math.sin(2 * Math.PI * p) * 15 * schrittTempo;
      armFrei.setAttribute("transform", "rotate(" + armSchwung.toFixed(1) + " " + hueftX + " 168)");
    }

    var hand = { x: BASIS_HAND.x + fx, y: BASIS_HAND.y };
    var ziel = rollePos || { x: 170, y: 180 };

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
    if (!imWand(p)) {
      /* Pinsel abgehoben: nicht malen und die Spur unterbrechen, sonst
         zieht der naechste Punkt einen Strich quer durch das Bild. */
      letzterPunkt = null;
      svg.classList.remove("am-streichen");
      return;
    }
    svg.classList.add("am-streichen");
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
  svg.addEventListener("pointerleave", function () {
    letzterPunkt = null;
    svg.classList.remove("am-streichen");
  });

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
      var mitte = (132 + WAND.y2) / 2;
      var y = mitte + Math.sin(t * 3.4) * ((WAND.y2 - 132) / 2 - 14);
      ausrichten({ x: x, y: y });
      malen({ x: x, y: y });
      if (fortschritt >= 1) { window.clearInterval(taktId); taktId = 0; }
    }, 32);
  }
  window.setTimeout(vorfuehren, 600);
})();
