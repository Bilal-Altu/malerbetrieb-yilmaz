/* =========================================================
   Leistungs-Zeilen: Bild folgt dem Mauszeiger
   Nur eine Zugabe für Zeigergeräte. Ohne JavaScript, auf
   Touchgeräten und bei "Bewegung reduzieren" bleibt die
   schlichte Liste mit Vorschaubild stehen — die ist der
   Grundzustand, nicht der Notfall.
   ========================================================= */
(function () {
  "use strict";

  var list = document.querySelector(".rows");
  if (!list) return;

  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  var wideEnough = window.matchMedia("(min-width: 861px)");
  var wantsCalm = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!canHover.matches || !wideEnough.matches || wantsCalm.matches) return;

  var rows = Array.prototype.slice.call(list.querySelectorAll(".row"));
  if (!rows.length) return;

  /* Alle Bilder als gestapelte Ebenen anlegen und nur die Deckkraft
     umschalten. Würde man stattdessen das src-Attribut tauschen,
     blitzt beim ersten Zeilenwechsel kurz ein leeres Feld auf. */
  var float = document.createElement("div");
  float.className = "rowfloat";
  float.setAttribute("aria-hidden", "true");

  var layers = rows.map(function (row) {
    var source = row.querySelector(".row__pic img");
    var layer = document.createElement("div");
    layer.className = "rowfloat__layer";
    if (source) {
      var img = document.createElement("img");
      img.src = source.currentSrc || source.src;
      img.alt = "";
      img.decoding = "async";
      layer.appendChild(img);
    }
    float.appendChild(layer);
    return layer;
  });

  document.body.appendChild(float);
  list.classList.add("rows--float");

  var boxW = 0, boxH = 0;
  function measure() {
    var r = float.getBoundingClientRect();
    boxW = r.width;
    boxH = r.height;
  }
  measure();
  window.addEventListener("resize", measure);

  var targetX = 0, targetY = 0;      // Ziel unter dem Zeiger
  var posX = 0, posY = 0;            // tatsächliche, nachlaufende Position
  var targetScale = 0.9, scale = 0.9;
  var active = -1;
  var frame = 0;
  var placed = false;

  /** Legt das Ziel neben den Zeiger und hält es im sichtbaren Bereich. */
  function aim(event) {
    var gap = 190;
    var x = event.clientX + gap;
    // Kein Platz mehr rechts? Dann auf die andere Seite des Zeigers.
    if (x + boxW / 2 > window.innerWidth - 16) x = event.clientX - gap;

    targetX = Math.min(Math.max(x, boxW / 2 + 16), window.innerWidth - boxW / 2 - 16);
    targetY = Math.min(Math.max(event.clientY, boxH / 2 + 16), window.innerHeight - boxH / 2 - 16);

    if (!placed) {            // beim ersten Mal nicht quer über den Schirm fliegen
      posX = targetX;
      posY = targetY;
      placed = true;
    }
  }

  function tick() {
    posX += (targetX - posX) * 0.14;
    posY += (targetY - posY) * 0.14;
    scale += (targetScale - scale) * 0.12;

    // Leichte Neigung aus der Restdistanz — gibt dem Nachlauf Gewicht
    var tilt = Math.max(-8, Math.min(8, (targetX - posX) * 0.05));

    float.style.transform =
      "translate3d(" + posX.toFixed(2) + "px," + posY.toFixed(2) + "px,0)" +
      " translate(-50%,-50%)" +
      " scale(" + scale.toFixed(3) + ")" +
      " rotate(" + tilt.toFixed(2) + "deg)";

    var moving = Math.abs(targetX - posX) > 0.3 ||
                 Math.abs(targetY - posY) > 0.3 ||
                 Math.abs(targetScale - scale) > 0.003;

    frame = (active >= 0 || moving) ? window.requestAnimationFrame(tick) : 0;
  }

  function run() { if (!frame) frame = window.requestAnimationFrame(tick); }

  function activate(index) {
    if (index === active) return;
    active = index;
    rows.forEach(function (row, i) { row.classList.toggle("is-active", i === index); });
    layers.forEach(function (layer, i) { layer.classList.toggle("is-on", i === index); });
    list.classList.add("is-hovering");
    float.classList.add("is-on");
    targetScale = 1;
    run();
  }

  function release() {
    active = -1;
    rows.forEach(function (row) { row.classList.remove("is-active"); });
    list.classList.remove("is-hovering");
    float.classList.remove("is-on");
    targetScale = 0.9;
    placed = false;
    run();
  }

  list.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    aim(e);
    run();
  });
  list.addEventListener("pointerleave", release);

  rows.forEach(function (row, i) {
    row.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      aim(e);
      activate(i);
    });
  });

  // Beim Wegscrollen nicht mitten in der Luft stehen bleiben
  window.addEventListener("scroll", function () {
    if (active < 0) return;
    var box = list.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) release();
  }, { passive: true });
})();
