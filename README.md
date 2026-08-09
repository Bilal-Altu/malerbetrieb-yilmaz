# R&T Yilmaz Malerbetrieb — neue Website

Statische Website, kein Baukasten, keine Datenbank, keine laufenden Kosten außer
Hosting und Domain. Läuft auf jedem Webspace und auf GitHub Pages.

```
malerbetrieb-yilmaz/
├─ index.html            Startseite (alle Abschnitte auf einer Seite)
├─ impressum.html
├─ datenschutz.html
├─ robots.txt
├─ sitemap.xml
└─ assets/
   ├─ css/style.css      komplettes Design
   ├─ js/main.js         Menü, Vorher/Nachher-Regler, Formular
   ├─ fonts/             Schriften lokal (DSGVO — kein Google-CDN)
   └─ img/               ← hier kommen die Baustellenfotos rein
```

## Lokal ansehen

`index.html` einfach doppelklicken. Alternativ mit kleinem Server:

```bash
npx serve malerbetrieb-yilmaz
```

## Was schon drin ist

- **Mobil zuerst**: feste Anruf-/WhatsApp-Leiste am unteren Bildschirmrand am Handy.
  Bei Handwerksbetrieben kommt der Großteil der Anfragen über genau diesen Knopf.
- **Vorher/Nachher-Regler** bei den Referenzen — das stärkste Verkaufsargument eines Malers.
- **Anfrageformular ohne Server**: baut aus den Eingaben eine fertige E-Mail oder
  WhatsApp-Nachricht. Nichts kann kaputtgehen, es gibt kein Postfach zu pflegen,
  und es entstehen keine Datenschutzpflichten für ein Backend.
- **Strukturierte Daten** (`Painter` + `FAQPage`) für Google — Basis für das
  Firmen-Panel rechts in der Suche und für aufklappbare Fragen im Suchergebnis.
- **Schriften lokal gehostet**, keine Verbindung zu Google-Servern beim Seitenaufruf.
  Damit fällt das Google-Fonts-Abmahnrisiko weg und es braucht kein Cookie-Banner.
- Impressum nach aktuellem **DDG** (das TMG von der alten Seite gibt es seit 2024 nicht mehr)
  und eine DSGVO-Datenschutzerklärung.

## Fotos einsetzen

Siehe `assets/img/BILDER-HIER-ABLEGEN.md`. Kurz: Datei mit dem passenden Namen in
`assets/img/` legen — fertig. Solange eine Datei fehlt, zeigt die Seite automatisch
einen sauberen Platzhalter mit Beschriftung statt eines kaputten Bildes.

## Vor dem Livegang klären

Diese Punkte stehen als `TODO` im Quelltext und müssen mit Hava/Hüseyin abgestimmt werden:

| # | Punkt | Wo |
|---|-------|-----|
| 1 | **Öffnungszeiten** bestätigen (aktuell Platzhalter Mo–Fr 07–17 Uhr) | `index.html`: Topbar, Kontaktblock, JSON-LD |
| 2 | **Umsatzsteuer-ID** ergänzen, falls vorhanden | `impressum.html` |
| 3 | **Handwerkskammer** bestätigen (vermutlich Frankfurt-Rhein-Main) | `impressum.html` |
| 4 | **Hoster** eintragen + ggf. AV-Vertrag abschließen | `datenschutz.html`, Punkt 3 |
| 5 | **Google-Bewertungslink** aus dem Unternehmensprofil einsetzen | `index.html`, Abschnitt Bewertungen |
| 6 | **Echte Bewertungen** eintragen und die Platzhalter entfernen | `index.html`, Abschnitt Bewertungen |
| 7 | Ist die **Mobilnummer 0178 7381857** für WhatsApp-Anfragen okay? | `index.html`, `assets/js/main.js` |

> **Wichtig zu den Bewertungen:** Im Quelltext stehen bewusst leere Platzhalter.
> Erfundene Kundenstimmen sind nach § 5 UWG wettbewerbswidrig und abmahnfähig —
> also erst eintragen, wenn echte Rezensionen da sind.

## Google-Sichtbarkeit — die Reihenfolge, die wirklich zählt

Hava will "ganz nach oben". Für einen Handwerksbetrieb passiert das nicht über die
Website allein, sondern über die lokale Kartenbox. Nach Wirkung sortiert:

**1. Google Unternehmensprofil (mit Abstand am wichtigsten)**
Kostenlos unter `business.google.com` anlegen bzw. übernehmen. Vollständig ausfüllen:
Hauptkategorie *Maler*, Nebenkategorien *Bauunternehmen*, *Trockenbaufirma*,
*Fassadenbau*. Einzugsgebiet auf Heppenheim, Bensheim, Lorsch, Zwingenberg,
Bürstadt, Lampertheim, Viernheim, Weinheim setzen. Leistungen einzeln eintragen,
Öffnungszeiten pflegen, Website verlinken. **Und Fotos hochladen** — Profile mit
vielen Fotos werden deutlich häufiger angeklickt.

**2. Bewertungen sammeln (Bilals Punkt aus dem Chat — er stimmt)**
Der Bewertungslink aus dem Unternehmensprofil lässt sich als QR-Code drucken und
auf die Rechnung kleben. Nach jeder abgeschlossenen Baustelle einmal freundlich
fragen. Faustregel: 15–20 echte Bewertungen bringen einen Handwerksbetrieb im
Ortsumkreis meist unter die ersten drei. **Auf jede Bewertung antworten** — auch
auf kritische, das sieht Google und der nächste Kunde liest es.
Niemals Bewertungen kaufen, das fliegt auf und kostet das Profil.

**3. Gleiche Daten überall (NAP-Konsistenz)**
Firmenname, Adresse und Telefonnummer müssen überall **zeichengenau identisch**
sein: Website, Google, Das Örtliche, Gelbe Seiten, 11880, wlw, Facebook.
Abweichungen (mal "R&T Yilmaz GmbH", mal "Malerbetrieb Yilmaz") schwächen das Ranking.
Vorgabe = die Schreibweise im Impressum dieser Website.

**4. HTTPS in Ordnung bringen — dringend**
Die alte Seite liefert derzeit ein **ungültiges SSL-Zertifikat** aus. Chrome zeigt
Besuchern dann eine rote Warnseite, und Google stuft die Seite ab. Beim Hoster ein
Let's-Encrypt-Zertifikat aktivieren (bei fast allen Anbietern ein Klick und kostenlos)
und `http://` dauerhaft auf `https://` weiterleiten.

**5. Search Console einrichten**
Unter `search.google.com/search-console` die Domain bestätigen und
`https://www.malerbetrieb-yilmaz.de/sitemap.xml` einreichen. Danach sieht man
schwarz auf weiß, für welche Suchbegriffe die Seite auftaucht.

**6. Später: eigene Seiten je Leistung und Ort**
Wenn die Basis steht, ist der nächste Hebel je eine eigene Unterseite für
"Fassadendämmung Heppenheim", "Maler Bensheim" usw. Erst dann sinnvoll — vorher
bringen Google-Profil und Bewertungen viel mehr pro Aufwand.

**7. Lokale Verlinkungen**
Eintrag bei der Handwerkskammer und der Innung, Sponsoring beim örtlichen Verein
mit Link, Lieferanten-Partnerseiten. Ein paar starke lokale Links schlagen hundert
Verzeichniseinträge.

### Was nichts bringt
Gekaufte Backlinks, SEO-Anrufe am Telefon ("Wir bringen Sie auf Platz 1"),
Keyword-Listen im Fußbereich, Text mit weißer Schrift auf weißem Grund.
Das ist entweder wirkungslos oder schädlich.

## Deployment

**GitHub Pages** (kostenlos, gut für die Abnahme durch die Kundin):
Ordnerinhalt in ein eigenes Repository, Pages im Branch `main` aktivieren.

**Eigener Webspace / bestehende Domain** (für den Livegang):
Alle Dateien per FTP in das Web-Wurzelverzeichnis laden. Es wird kein PHP,
kein Node und keine Datenbank benötigt.

Beim Umschalten auf die echte Domain daran denken:
- alte Unterseiten (`firma.html`, `putz.html`, `tapete.html`, `trockenbau.html`,
  `sanieren.html`, `fassade.html`, `referenzen.html`, `kontakt.html`, `anfrage.html`,
  `umwelt.html`) per **301-Weiterleitung** auf die neue Startseite bzw. die
  passenden Abschnitte umleiten, damit vorhandene Google-Positionen nicht verloren gehen;
- `www.` und Nicht-`www.` auf eine Variante festlegen;
- `og-bild.jpg` hinterlegen, damit WhatsApp-Links eine Vorschau zeigen.
