/* =========================================================
   Leistungen: mitlaufendes Bildfeld

   Bewusst vom Scrollen gesteuert, nicht vom Mauszeiger. Auf dem
   Handy gibt es kein Hover — und dort wird die Seite zuerst
   angeschaut. Das Bildfeld klebt oben (Handy) bzw. rechts
   (ab Tablet) und wechselt auf die Zeile, die gerade durch die
   Mitte des Bildschirms läuft.

   Ohne JavaScript bleiben die kleinen Vorschaubilder in den
   Zeilen stehen; das ist der Grundzustand im HTML.
   ========================================================= */
(function () {
  "use strict";

  var wrap = document.querySelector(".svc");
  var list = wrap && wrap.querySelector(".rows");
  if (!wrap || !list || !("IntersectionObserver" in window)) return;

  var rows = Array.prototype.slice.call(list.querySelectorAll(".row"));
  if (rows.length < 2) return;

  /* Bildfeld aus den vorhandenen Zeilenbildern bauen. Alle Ebenen
     liegen gleichzeitig da und werden nur ein- und ausgeblendet —
     ein Tausch des src-Attributs würde beim ersten Wechsel je Zeile
     kurz ein leeres Feld zeigen. */
  var media = document.createElement("div");
  media.className = "svc__media";
  media.setAttribute("aria-hidden", "true");

  var layers = rows.map(function (row, i) {
    var source = row.querySelector(".row__pic img");
    var layer = document.createElement("div");
    layer.className = "svc__layer" + (i === 0 ? " is-on" : "");
    if (source) {
      var img = document.createElement("img");
      img.src = source.currentSrc || source.src;
      img.alt = "";
      img.decoding = "async";
      layer.appendChild(img);
    }
    media.appendChild(layer);
    return layer;
  });

  function label(n) { return (n < 10 ? "0" : "") + n; }

  var counter = document.createElement("span");
  counter.className = "svc__idx";
  counter.innerHTML = "<b>" + label(1) + "</b> / " + label(rows.length);
  media.appendChild(counter);

  wrap.insertBefore(media, wrap.firstChild);
  /* Erst jetzt umschalten: Die Klasse blendet die Vorschaubilder in den
     Zeilen aus. Käme sie früher — oder hinge sie nur daran, dass
     JavaScript läuft — stünde die Sektion bei einem Fehler oberhalb
     dieser Zeile ganz ohne Bilder da. */
  wrap.classList.add("svc--live");

  var active = -1;

  function activate(index) {
    if (index === active || index < 0) return;
    active = index;
    rows.forEach(function (row, i) { row.classList.toggle("is-active", i === index); });
    layers.forEach(function (layer, i) { layer.classList.toggle("is-on", i === index); });
    counter.innerHTML = "<b>" + label(index + 1) + "</b> / " + label(rows.length);
  }

  /* Schmales Band quer durch die Bildschirmmitte. Was dieses Band
     schneidet, gilt als die Zeile, die man gerade liest. */
  var inBand = [];

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var i = rows.indexOf(entry.target);
      var at = inBand.indexOf(i);
      if (entry.isIntersecting && at === -1) inBand.push(i);
      if (!entry.isIntersecting && at > -1) inBand.splice(at, 1);
    });

    wrap.classList.toggle("is-live", inBand.length > 0);
    if (!inBand.length) return;

    /* Liegen mehrere Zeilen im Band, gewinnt die, deren Mitte der
       Bildschirmmitte am nächsten ist. */
    var middle = window.innerHeight / 2;
    var best = inBand[0];
    var bestGap = Infinity;
    inBand.forEach(function (i) {
      var box = rows[i].getBoundingClientRect();
      var gap = Math.abs(box.top + box.height / 2 - middle);
      if (gap < bestGap) { bestGap = gap; best = i; }
    });
    activate(best);
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

  rows.forEach(function (row) { watcher.observe(row); });
})();
