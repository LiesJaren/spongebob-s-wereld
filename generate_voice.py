#!/usr/bin/env python3
"""Genereer de voorleesstem voor Jaren's Onderwatermissies.

De app gebruikt vooraf ingesproken clipjes voor alle vaste zinnen. Zo werkt
voorlezen ook zonder dat er een Nederlandse stem in de browser staat.

Standaardstem: een warme, iets lage Belgisch-Nederlandse kapiteinsstem
(Edge TTS "nl-BE-ArnaudNeural"), daarna zachtjes verlaagd en warm gemaakt.

Gebruik:
    python3 voice/generate_voice.py
    python3 voice/generate_voice.py --force      # alles opnieuw inspreken
    python3 voice/generate_voice.py --check      # alleen controleren
    python3 voice/generate_voice.py --prune      # oude clipjes opruimen

Benodigd (eenmalig):
    python3 -m pip install edge-tts imageio-ffmpeg
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import edge_tts
except ImportError:  # pragma: no cover - duidelijke boodschap voor de ouder
    edge_tts = None

ROOT = Path(__file__).resolve().parent.parent
VOICE_DIR = ROOT / "voice"
CLIPS_DIR = VOICE_DIR / "clips"
MANIFEST_JS = VOICE_DIR / "clips.js"
MANIFEST_JSON = VOICE_DIR / "manifest.json"

DEFAULT_VOICE = "nl-BE-ArnaudNeural"
DEFAULT_RATE = "-6%"
DEFAULT_PITCH = "-10Hz"

# ---------------------------------------------------------------------------
# Alle vaste zinnen. Houd deze lijst gelijk met app.js en
# games/practiceGames.js. Met --check krijg je een waarschuwing als een
# letterlijke speak('...')-zin ontbreekt.
# ---------------------------------------------------------------------------

TASKS = [
    {
        "title": "Kleren in de wasmand",
        "steps": [
            "Pak de afgesproken vuile kleren.",
            "Breng ze rustig naar de wasmand.",
            "Leg de kleren in de wasmand.",
        ],
        "success": "Je kleren liggen in de wasmand. Dat helpt ons thuis.",
        "points": 5,
    },
    {
        "title": "Speelgoed opruimen",
        "steps": [
            "Kies één speelgoedsoort.",
            "Stop die in de juiste bak.",
            "Bekijk samen het opgeruimde plekje.",
        ],
        "success": "Je speelplek is weer opgeruimd. Fijn gedaan!",
        "points": 10,
    },
    {
        "title": "Boekentas klaarzetten",
        "steps": [
            "Kijk samen wat er mee moet.",
            "Stop de spullen in je tas.",
            "Zet je tas op de vaste plek.",
        ],
        "success": "Je tas staat klaar voor de vaarschool. Goed voorbereid!",
        "points": 10,
    },
    {
        "title": "Bordje wegzetten",
        "steps": [
            "Pak je eigen bord.",
            "Breng het rustig naar de afgesproken plek.",
            "Zet het bord veilig neer.",
        ],
        "success": "Je bord staat veilig op de afgesproken plek. Dank je wel!",
        "points": 5,
    },
    {
        "title": "Afval weggooien",
        "steps": [
            "Pak het afgesproken veilige afval.",
            "Kies samen de juiste bak.",
            "Gooi het afval erin.",
        ],
        "success": "Het afval zit in de juiste bak. De zee blijft een beetje schoner!",
        "points": 3,
    },
]

SHOP_ITEM_NAMES = [
    "Werknemersmuts",
    "Kwallenvangersnetje",
    "Superheldencape",
    "Piratenhoed",
    "Duikhelm",
    "Schelpenlamp",
    "Zeesterrenmat",
    "Bubbelaquarium",
    "Schatkist",
    "Piratenraam",
]

STATIC_PHRASES = [
    "Hoi Jaren! Dit kun je vandaag doen. Kies een missie. Je mag altijd om hulp of pauze vragen.",
    "Klaar met je missie? Laat het even aan mama of papa zien.",
    "Goed gedaan! Laat het even aan mama of papa zien.",
    "Goed gedaan! Laat het even aan mama of papa zien. Je hoeft niets opnieuw te doen.",
    "Waarmee kan ik helpen?",
    "Pauze. Je stap blijft bewaard.",
    "Hallo Jaren! Ik lees weer voor.",
    "Je aanvraag is verstuurd. Mama of Birger bevestigt de afspraak.",
]

PRACTICE_GAMES = [
    {
        "spoken": "Tik op een kledingstuk. Tik daarna op de wasmand. Neem rustig je tijd.",
        "resultDone": "De wasmand is vol! Nu mag je het thuis doen.",
        "summary": "Goed geoefend met de wasmand! Nu mag je het thuis doen.",
    },
    {
        "spoken": "Tik op de speeltjes. Dan gaan ze in de speelgoedbak. Neem rustig je tijd.",
        "resultDone": "Alle speeltjes zitten in de bak! Nu mag je het thuis doen.",
        "summary": "Goed geoefend met opruimen! Nu mag je het thuis doen.",
    },
    {
        "spoken": "Tik op de brooddoos, de drinkfles en het boek. Dan zitten ze in je tas. Neem rustig je tijd.",
        "resultDone": "Je tas is klaar! Nu mag je het thuis doen.",
        "summary": "Goed geoefend met je boekentas! Nu mag je het thuis doen.",
    },
    {
        "spoken": "Tik op de stap die oplicht. Eerst je bord pakken, dan lopen, dan neerzetten. Neem rustig je tijd.",
        "resultDone": "Het bordje staat op de afruimplek! Nu mag je het thuis doen.",
        "summary": "Goed geoefend met het bordje! Nu mag je het thuis doen.",
    },
    {
        "spoken": "Dit is schoon, droog papier. Waar hoort het? Tik op de papierbak. Neem rustig je tijd.",
        "resultDone": "Alles zit in de papierbak! Nu mag je het thuis doen.",
        "summary": "Goed geoefend met afval sorteren! Nu mag je het thuis doen.",
    },
    {
        "spoken": "Tik op de bubbels om ze te laten ploppen. Je mag stoppen wanneer je wilt. Neem rustig je tijd.",
        "resultDone": "Goed gebubbeld!",
        "summary": "Goed gebubbeld!",
    },
]

LAUNDRY_ITEMS = [
    ("Je koos het T-shirt. Tik nu op de wasmand.", "Het T-shirt zit in de wasmand."),
    ("Je koos de sokken. Tik nu op de wasmand.", "De sokken zitten in de wasmand."),
    ("Je koos de broek. Tik nu op de wasmand.", "De broek zit in de wasmand."),
    ("Je koos het jurkje. Tik nu op de wasmand.", "Het jurkje zit in de wasmand."),
]

TOYS_DONE = [
    "De knuffel ligt in de speelgoedbak!",
    "Het autootje ligt in de speelgoedbak!",
    "De puzzel ligt in de speelgoedbak!",
]

SCHOOL_DONE = [
    "De brooddoos zit in de tas!",
    "De drinkfles zit in de tas!",
    "Het boek zit in de tas!",
]

PLATE_STEPS = [
    "Pak je bord",
    "Loop naar de afruimplek",
    "Zet je bord neer",
]

WASTE_PHRASES = [
    "Goed zo! Papier hoort bij papier.",
    "Dit is schoon, droog papier. Probeer de papierbak.",
]


def kwal(amount: int) -> str:
    return f"{amount} {'kwal' if amount == 1 else 'kwallen'}"


def mission_read_text(task: dict, step_index: int) -> str:
    return (
        f"{task['title']}. Stap {step_index + 1} van {len(task['steps'])}. "
        f"{task['steps'][step_index]}"
    )


def build_phrases() -> list[str]:
    phrases: list[str] = []
    phrases.extend(STATIC_PHRASES)

    for task in TASKS:
        for index, step in enumerate(task["steps"]):
            phrases.append(mission_read_text(task, index))
            phrases.append(step)
            phrases.append(f"Deze stap: {step}")
        phrases.append(f"Vraag mama of papa om de eerste stap samen te doen: {task['steps'][0]}")
        phrases.append(f"{task['success']} Je kreeg {kwal(task['points'])}.")

    for name in SHOP_ITEM_NAMES:
        phrases.append(f"{name} is van jou.")

    for game in PRACTICE_GAMES:
        phrases.extend([game["spoken"], game["resultDone"], game["summary"]])

    for select, done in LAUNDRY_ITEMS:
        phrases.extend([select, done])
    phrases.extend(TOYS_DONE)
    phrases.extend(SCHOOL_DONE)
    phrases.extend(PLATE_STEPS)
    phrases.extend(WASTE_PHRASES)

    return phrases


def voice_key(text: str) -> str:
    """Zelfde sleutel als voiceKey() in app.js: alleen letters en cijfers."""
    return " ".join(re.findall(r"[^\W_]+", text.lower(), flags=re.UNICODE))


def unique_phrases() -> dict[str, str]:
    result: dict[str, str] = {}
    for text in build_phrases():
        text = " ".join(str(text).split())
        if not text:
            continue
        key = voice_key(text)
        if key in result and result[key] != text:
            raise SystemExit(
                "Twee verschillende zinnen hebben dezelfde spraaksleutel:\n"
                f"  {result[key]!r}\n  {text!r}"
            )
        result[key] = text
    return result


def clip_name(voice: str, rate: str, pitch: str, key: str) -> str:
    digest = hashlib.sha1(f"{voice}|{rate}|{pitch}|{key}".encode("utf-8")).hexdigest()[:12]
    return f"{digest}.mp3"


def ffmpeg_path() -> str:
    configured = os.environ.get("FFMPEG")
    if configured:
        return configured
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        found = shutil.which("ffmpeg")
        if found:
            return found
    raise SystemExit(
        "ffmpeg niet gevonden. Installeer het met:\n"
        "  python3 -m pip install imageio-ffmpeg\n"
        "of zet FFMPEG=/pad/naar/ffmpeg."
    )


AUDIO_FILTER = (
    "highpass=f=70,"
    "rubberband=pitch=0.98:formant=preserved,"
    "equalizer=f=110:t=q:w=1:g=2,"
    "equalizer=f=330:t=q:w=1:g=-1.5,"
    "equalizer=f=2600:t=q:w=1.2:g=1,"
    "aexciter=level_in=1:level_out=1:amount=0.9:drive=5.5:blend=0:freq=3000:ceil=10000,"
    "acompressor=threshold=-20dB:ratio=3:attack=10:release=150:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=7,"
    "alimiter=limit=0.95,"
    "aresample=44100"
)


async def synthesize(text: str, path: Path, voice: str, rate: str, pitch: str) -> None:
    if edge_tts is None:
        raise SystemExit(
            "edge-tts ontbreekt. Installeer het met:\n"
            "  python3 -m pip install edge-tts imageio-ffmpeg"
        )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            communication = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await communication.save(str(path))
            return
        except Exception as error:  # noqa: BLE001 - opnieuw proberen is hier nuttig
            last_error = error
            await asyncio.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Kon geen audio maken voor {text!r}: {last_error}")


def process_audio(ffmpeg: str, source: Path, destination: Path) -> None:
    command = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(source),
        "-af",
        AUDIO_FILTER,
        "-ac",
        "1",
        "-ar",
        "44100",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "96k",
        "-map_metadata",
        "-1",
        str(destination),
    ]
    subprocess.run(command, check=True)


def write_manifests(entries: list[dict[str, str]], voice: str, rate: str, pitch: str) -> None:
    mapping = {entry["key"]: entry["file"] for entry in entries}
    lines = [
        "/* Automatisch gegenereerd door voice/generate_voice.py.",
        "   Niet met de hand aanpassen: voer het script opnieuw uit. */",
        "window.JAREN_VOICE_CLIPS = {",
    ]
    for key in sorted(mapping):
        lines.append(f"  {json.dumps(key, ensure_ascii=False)}: {json.dumps(mapping[key])},")
    lines.append("};")
    lines.append("")
    MANIFEST_JS.write_text("\n".join(lines), encoding="utf-8")

    manifest = {
        "voice": voice,
        "rate": rate,
        "pitch": pitch,
        "count": len(entries),
        "clips": [
            {"key": entry["key"], "text": entry["text"], "file": entry["file"]}
            for entry in sorted(entries, key=lambda entry: entry["key"])
        ],
    }
    MANIFEST_JSON.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def check_literals(entries: list[dict[str, str]]) -> list[str]:
    """Meld letterlijke speak('...')/say('...')-zinnen zonder clip."""
    known = {entry["key"] for entry in entries}
    missing: list[str] = []
    pattern = re.compile(r"\b(?:speak|say)\(\s*(['\"])(.+?)\1\s*\)")
    for relative in ("app.js", "games/practiceGames.js"):
        path = ROOT / relative
        if not path.exists():
            continue
        for match in pattern.finditer(path.read_text(encoding="utf-8")):
            text = match.group(2)
            if "${" in text:
                continue
            if voice_key(text) not in known:
                missing.append(f"{relative}: {text}")
    return missing


async def main() -> int:
    parser = argparse.ArgumentParser(description="Genereer de kapiteinsstem voor de app.")
    parser.add_argument("--force", action="store_true", help="bestaande clipjes opnieuw inspreken")
    parser.add_argument("--check", action="store_true", help="alleen controleren, niets genereren")
    parser.add_argument("--prune", action="store_true", help="niet-gebruikte mp3-bestanden verwijderen")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Edge TTS-stem")
    parser.add_argument("--rate", default=DEFAULT_RATE, help="spreektempo, bijvoorbeeld -6%%")
    parser.add_argument("--pitch", default=DEFAULT_PITCH, help="toonhoogte, bijvoorbeeld -10Hz")
    args = parser.parse_args()

    phrases = unique_phrases()

    if args.check:
        missing = check_literals(list({"key": key, "text": text, "file": ""} for key, text in phrases.items()))
        print(f"{len(phrases)} vaste zinnen in de stemlijst.")
        if missing:
            print("Geen clip voor deze letterlijke regels:")
            for line in missing:
                print(f"  - {line}")
            return 1
        print("Alle letterlijke speak()/say()-zinnen hebben een clip.")
        return 0

    ffmpeg = ffmpeg_path()
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)

    entries: list[dict[str, str]] = []
    created = 0
    skipped = 0
    with tempfile.TemporaryDirectory(prefix="jaren-voice-") as temporary:
        temp_dir = Path(temporary)
        for index, (key, text) in enumerate(sorted(phrases.items()), start=1):
            name = clip_name(args.voice, args.rate, args.pitch, key)
            destination = CLIPS_DIR / name
            entries.append({"key": key, "text": text, "file": f"voice/clips/{name}"})
            if destination.exists() and not args.force:
                skipped += 1
                continue

            print(f"[{index}/{len(phrases)}] {text}")
            raw = temp_dir / f"{index}.mp3"
            await synthesize(text, raw, args.voice, args.rate, args.pitch)
            process_audio(ffmpeg, raw, destination)
            created += 1

    write_manifests(entries, args.voice, args.rate, args.pitch)

    if args.prune:
        keep = {Path(entry["file"]).name for entry in entries}
        removed = 0
        for clip in CLIPS_DIR.glob("*.mp3"):
            if clip.name not in keep:
                clip.unlink()
                removed += 1
        if removed:
            print(f"{removed} oude clipjes opgeruimd.")

    missing = check_literals(entries)
    print(
        f"Klaar: {created} nieuwe clipjes, {skipped} overgeslagen, "
        f"{len(entries)} zinnen in voice/clips.js."
    )
    if missing:
        print("Let op: deze letterlijke regels hebben nog geen clip:")
        for line in missing:
            print(f"  - {line}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
