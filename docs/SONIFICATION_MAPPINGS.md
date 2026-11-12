# EARTHSONIC — Sonification mappings

> This file is GENERATED from `src/core/mappings.ts` and `src/registry/phenomena.ts` by `npm run docs`. Do not edit it by hand.

## Principles

1. **Pitch for magnitude.** The main measured quantity maps to pitch, linear in semitones: equal steps in the data are equal musical intervals.
2. **Fixed reference scales.** Each pitch domain is fixed for the physical quantity, not taken from the selected dates, so two periods can be compared by ear. Values outside a domain are held at its end and the caption says so.
3. **Reference tone.** Where a zero point exists (a baseline or a starting level), a quiet steady tone marks it.
4. **Rate of change is rhythm.** The speed of change drives how many short pulses play per step. It does not change playback speed, which is a separate user control.
5. **Missing is silent.** A missing value makes that voice silent and is announced in text. Nothing is interpolated.
6. **Safe by construction.** Every pitch is held inside 110–1760 Hz; the output passes through a limiter.
7. **Determinism.** The same data and settings give the same notes (same fingerprint), and the same downloadable audio file. No random numbers are used anywhere in the data-to-sound path.
8. **Two listening modes.** Scientific: continuous pitch. Musical: each pitch snaps to the nearest note of the C major pentatonic scale (C D E G A). Same data, same mapping, same legend.
9. **Intensity** (0–1, default 0.5) scales loudness and brightness contrast only. It never changes pitch.

## Global temperature

**What you hear:** A rising pitch for each warmer year, with the Arctic and the tropics as separate voices and a bell for every new record.

**Data:** GISS Surface Temperature Analysis (GISTEMP) version 4, Land-Ocean Temperature Index. Units: Degrees Celsius, as a difference (anomaly) from the 1951–1980 average. One step is one year.

| Voice | Stands for | How it sounds |
|---|---|---|
| Reference tone (fixed tone 286.1 Hz, sine, pan 0) | Baseline: the 1951–1980 average (anomaly = 0). | A steady quiet tone at the pitch where the main voice sits when the value is 0 (anomaly 0 °C), so you can hear distance from it. |
| Global voice (triangle, pan 0) | Global average temperature anomaly. | Pitch: −0.6 °C is G3 (196 Hz) and +1.6 °C is G5 (784 Hz). Each step up in pitch is a warmer year; pitch moves in equal musical intervals for equal temperature steps. Brightness: warmer years also sound brighter (more overtones), so temperature is heard twice, in pitch and in tone colour. |
| Arctic voice (sine, pan 0.45) | Anomaly of the Arctic (64°N–90°N), right ear, higher register. | Pitch: −1.5 °C is G4 (392 Hz) and +4 °C is G6 (1568 Hz). The Arctic warms faster than the globe, so this voice climbs further. Stereo: right ear, only to tell the voices apart. |
| Tropics voice (sine, pan -0.45) | Anomaly of the tropics (24°S–24°N), left ear, lower register. | Pitch: −0.6 °C is C3 (131 Hz) and +1.6 °C is C5 (523 Hz). Stereo: left ear, only to tell the voices apart. |
| Rate pulses (fixed tone 1046.5 Hz, sine, pan 0) | How fast the world is warming. | Rhythm: 0 °C per decade gives no pulses; 0.4 °C per decade gives 4 quick pulses per year. A busier rhythm means faster warming. (Playback speed is a separate control.) |
| Record bell (fixed tone 1318.5 Hz, triangle, pan 0) | A new warmest year on record. | A bell rings in any year warmer than every year before it. |

**Accent:** Record years (warmer than all earlier years) get a bell.

**Time Travel difference voice:** Difference voice: pitch above the reference tone means period B was warmer than period A at the same position; below means cooler. ±1 °C spans two octaves.

**Limitations:**

- Yearly averages hide seasons and short events such as individual heat waves.
- The early record rests on far fewer stations and ship measurements, so early years are less certain than recent ones; this app does not display GISTEMP's uncertainty ranges.
- The latitude-band voices are broad averages of very large areas.
- The most recent year is left out until the file contains a full January–December value.

## Sea level

**What you hear:** A pitch that climbs as global sea level rises, with a pulse rhythm that gets busier as the rise speeds up.

**Data:** Global Mean Sea Level from satellite altimetry (NASA Sea Level Change Team, GSFC GMSL series; version 5.2 is DOI 10.5067/GMSLM-TJ152, version 5.1 used in NASA's visualization is DOI 10.5067/GMSLM-TJ151). Units: Millimetres of change in global mean sea level (shown as rise since the first complete year). One step is one year.

| Voice | Stands for | How it sounds |
|---|---|---|
| Reference tone (fixed tone 215.0 Hz, sine, pan 0) | Starting level: the first complete year of the record (rise = 0 mm). | A steady quiet tone at the pitch where the main voice sits when the value is 0 (0 mm rise), so you can hear distance from it. |
| Sea level voice (triangle, pan 0) | Global mean sea level rise since the first year. | Pitch: −10 mm is G3 (196 Hz) and +140 mm is G5 (784 Hz). Higher pitch means higher global sea level. Brightness: a higher sea level also sounds brighter (more overtones). |
| Rate pulses (fixed tone 1046.5 Hz, sine, pan 0) | How fast sea level is rising. | Rhythm: 0 mm per year gives no pulses; 6 mm per year gives 4 quick pulses per year. A busier rhythm means faster rise. |

**Time Travel difference voice:** Difference voice: pitch above the reference tone means period B had higher sea level than period A at the same position. ±60 mm spans two octaves.

**Limitations:**

- Global mean sea level hides large regional differences; local sea level change can be quite different.
- The series is smoothed (60 days) and then averaged to years, so short-term variation is not audible.
- Different versions of the product handle land-motion corrections (GIA) differently; this app uses the column the file labels as smoothed and GIA-applied, and shows its exact label.
- The most recent estimates can be preliminary (NASA's visualization notes that later satellite estimates are preliminary) and may change.
- "Rise" is measured from the first complete year in the file, so it is not an absolute height.

## Arctic sea ice

**What you hear:** Two voices, the March maximum and the September minimum, that sound lower as there is less ice, with a bell for every record-low September.

**Data:** Sea Ice Index, Version 4 (daily Arctic sea ice extent). Units: Million square kilometres of ocean with at least 15% ice (extent). One step is one year.

| Voice | Stands for | How it sounds |
|---|---|---|
| March maximum (triangle, pan -0.3) | Arctic sea ice extent in March, the yearly maximum, left of centre. | Pitch: 13 million km² is C4 (262 Hz) and 16.8 million km² is C6 (1047 Hz). Less ice sounds lower. Stereo: left of centre, only to tell the voices apart. |
| September minimum (sine, pan 0.3) | Arctic sea ice extent in September, the yearly minimum, right of centre. | Pitch: 3 million km² is C3 (131 Hz) and 8 million km² is C5 (523 Hz). Less ice sounds lower. Stereo: right of centre, only to tell the voices apart. |
| Rate pulses (fixed tone 1046.5 Hz, sine, pan 0) | How fast the September ice extent is changing (size of the change, losing or gaining). | Rhythm: no change gives no pulses; a change of 1.2 million km² per decade (up or down) gives 4 quick pulses per year. |
| Record-low bell (fixed tone 1318.5 Hz, triangle, pan 0) | A new lowest September extent on record. | A bell rings in any year with less September ice than every year before it. |

**Accent:** New record-low Septembers get a bell.

**Time Travel difference voice:** Difference voice: pitch above the reference tone means period B had MORE September ice than period A at the same position; below means less. ±3 million km² spans two octaves.

**Limitations:**

- Extent is not the same as ice volume or thickness; thin ice and thick ice count the same.
- The 15% threshold and the satellite sensors have changed over the decades, though NSIDC works to keep the record consistent.
- Only the Arctic is shown; the Antarctic behaves differently.
- Months need at least 10 valid daily values to produce an average.

## Vegetation

**What you hear:** A tone whose pitch and richness grow as land turns greener, with a second voice that moves up when vegetation is greening and down when it is browning.

**Data:** MODIS/Terra Vegetation Indices 16-Day L3 Global 250 m (MOD13Q1), NDVI band, read through the ORNL DAAC MODIS Land Product Subsets web service. Units: NDVI, a unitless index from about 0 (bare ground) to about 1 (dense green vegetation). One step is one composite.

| Voice | Stands for | How it sounds |
|---|---|---|
| Greenness voice (sawtooth, pan 0) | Vegetation greenness (NDVI) of each 16-day composite. | Pitch: NDVI 0 is A2 (110 Hz) and 0.9 is A4 (440 Hz). Harmonic richness: greener land sounds richer. The tone starts nearly pure at NDVI 0.1 and gains more overtones (a brighter, fuller sound) as NDVI rises to 0.9. |
| Change voice (sine, pan 0.4) | Greening or browning since the previous composite, right ear. | Pitch: falling NDVI sounds lower (E4, 330 Hz at −0.1) and rising NDVI higher (E5, 659 Hz at +0.1). Rhythm: the bigger the change, the more pulses (up to 3 per composite). Stereo: right ear, only to tell the voices apart. |

**Time Travel difference voice:** Difference voice: pitch above the reference tone means the later period was greener than the earlier one at the same position; below means less green. ±0.5 NDVI spans two octaves.

**Limitations:**

- Each value is a small box around one chosen site, not a whole region or country.
- Only values inside the valid NDVI range are used; the product's separate quality flags (clouds, snow, aerosols) are not applied, so some composites may be affected by them.
- NDVI levels off over very dense forest, so changes there are small.
- The picture (when shown) is an 8-day NASA image product while the numbers are 16-day composites, so they do not cover identical windows.

