# Bevolkingsregister Nijmegen 1880-1890

Straten waar inwoners woonden, beroepen, en geboorteplaatsen.

## Plan

1. XLSX omzetten naar CSV, dan naar JSON, met selectie van veldnamen
  - achternaam
  - voornaam
  - tussenvoegsel
  - patroniem
  - geboortedatum
  - geboorteplaats
  - beroep
  - straat
2. Alle straten en geboorteplaatsen geocoderen met Histograph
3. Bestand maken met, per voorkomende straat, lijst met rijen uit BR
4. Bestand maken met straten die níet gegeocodeerd konden worden - die handmatig koppelen!
4. Kaartviewer maken waarmee je op straat kunt klikken, dan lijst met geboorteplaatsen (en evt. beroepen)
4. En maken dat je dan stipjes in NL ziet van alle geboorteplaatsen!

## Data converteren

Eerst:

    $ npm install

Dan:

    $ node index.js

Dan `index.html` in browser openen, liefst via lokale webserver, bv. met `python -m SimpleHTTPServer`.
