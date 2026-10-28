# Jaren's Onderwatermissies

Een complete, lokale app met kleine onderwatermissies voor Jaren. De app gebruikt Jaren's avatar en bewaart alle voortgang alleen in de browser op dit apparaat.

## Starten

Open in deze map een terminal en voer uit:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open daarna <http://127.0.0.1:4173>. `index.html` is de app; de losse `welcome.html`, `missions.html`, `mission-view.html` en `room-view.html` sturen automatisch door naar de juiste plek in de app.

Op een telefoon of tablet kun je de pagina via het browsermenu aan het beginscherm toevoegen. Daarvoor moet de lokale server wel bereikbaar zijn. Start hem in dat geval met `python3 -m http.server 4173 --bind 0.0.0.0` en open op het toestel `http://<ip-van-de-computer>:4173`. De voortgang blijft per toestel apart; er is geen synchronisatie.

## Wat de app doet

- Elke dag staan er drie passende missies klaar, afhankelijk van de weekdag.
- Een missie wordt stap voor stap gedaan, met knoppen voor **Gedaan**, **Help mij even**, **Pauze** en voorlezen.
- De missie zelf is de kleine oefening: stap voor stap, in het tempo van Jaren. Bij elke stap staat optioneel **Oefen** waarmee Jaren de taak eerst rustig virtueel doet en daarna thuis in het echt.
- De oefenspelletjes hebben geen timer, geen score en geen verlies. Grote iconen en gesproken uitleg zorgen dat lezen niet nodig is: kleren in de wasmand, speelgoed opruimen, de boekentas klaarzetten, een bordje wegzetten en papier in de juiste bak sorteren.
- **Even bubbelen** is een apart, vrij spelletje zonder doel. Jaren tikt bubbels kapot en mag stoppen wanneer hij wil.
- Oefenen geeft geen kwallen. Die komen pas als een ouder de echte taak heeft goedgekeurd.
- Na **Mijn taak is klaar** wacht de missie op een ouder. Pas na goedkeuring komen er kwallen bij.
- Ouders kunnen goedkeuren of **Nog één stap samen** kiezen, zonder punten af te nemen.
- Met kwallen koopt Jaren avatarspullen en meubels voor zijn kamer. Zijn heldenervaring en titel blijven altijd behouden.
- In de schatkist staan echte beloningen die ouders zelf instellen. Een aanvraag reserveert het bedrag; annuleren of afwijzen geeft het een keer terug.
- De ouderhoek heeft een lokale PIN, instellingen voor de voorleesstem en rustige stand, plus export en herstel van de voortgang. De eerste keer kies je zelf vier cijfers; er is geen standaard-PIN.

## Voorleesstem

De vaste zinnen zijn vooraf ingesproken met een warme, iets lage Belgisch-Nederlandse kapiteinsstem: speels, rustig en een beetje hees. De stem is geïnspireerd op het idee van een vrolijke kapitein-moderator, niet op een bestaande acteur of personage.

De clipjes staan in `voice/clips/` en de koppeling tussen zin en bestand staat in `voice/clips.js`. `index.html` laadt dat bestand vóór `app.js`. De app speelt één clip tegelijk; een nieuwe zin stopt de vorige.

De stem opnieuw inspreken kan met:

```sh
python3 -m pip install edge-tts imageio-ffmpeg
python3 voice/generate_voice.py
```

Nuttige opties:

- `--force` maakt alle clipjes opnieuw.
- `--check` controleert of elke vaste `speak('...')`-zin een clip heeft.
- `--prune` verwijdert oude clipjes die niet meer in de lijst staan.
- `--voice nl-BE-ArnaudNeural --rate=-6% --pitch=-10Hz` kiest een andere stem of toonhoogte.

Het inspreken zelf gebruikt een internetverbinding (Edge TTS). Daarna is de app volledig lokaal: bij normaal gebruik wordt er niets naar buiten gestuurd.

## Belangrijk om te weten

- Gegevens staan alleen op dit toestel. Er zijn geen accounts of synchronisatie tussen telefoons.
- De PIN voorkomt toevallig aantikken; hij beveiligt geen gevoelige gegevens.
- De voorleesstem gebruikt meegeleverde audioclipjes in `voice/clips/`. Daardoor werkt voorlezen ook als de browser geen Nederlandse stem heeft. Alleen een eigen berichtje van een ouder wordt via de browserstem voorgelezen als daar een stem voor is.
- Er is geen aftellende timer, geen scoredoel en geen straf. De oefenspelletjes tellen alleen rustig mee hoeveel spullen al gedaan zijn.
- De intro uit het SpongeBob-filmpje speelt alleen als je zelf op **Beluister de intro** drukt. Er is geen achtergrondmuziek.
- Maak af en toe een reservekopie via **Voortgang exporteren**. Als de PIN vergeten is, kan alleen de sitegegevens wissen de ouderhoek weer openen; daarmee verdwijnt ook de voortgang.
