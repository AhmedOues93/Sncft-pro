# CSV Import Contract (Phase 2)

This document defines the **expected CSV formats** for SNCFT Navigator imports.
These are import-engine contracts (raw input) and are not a direct DB dump format.

## 1) `lines.csv`

| Column | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `line_code` | string | yes | `A` | Unique per import (e.g. A, D, E). |
| `line_name` | string | yes | `Ligne A` | Display name. |
| `color` | string | no | `#0074D9` | Optional hex color. |
| `active` | boolean-ish | no | `true` | Defaults to true. |

## 2) `stations.csv`

| Column | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `station_id` | string | yes | `TVL` | External source station identifier (stable within import). |
| `station_name` | string | yes | `Tunis Ville` | Canonical station display name. |
| `lat` | number | no | `36.8008` | Optional latitude. |
| `lon` | number | no | `10.1801` | Optional longitude. |
| `aliases` | string | no | `Tunis-Ville;Tunis Ville SNCFT` | Semicolon-separated aliases. |

## 3) `schedules.csv` (trip + stop_times rows)

Each row represents one stop call in one trip.

| Column | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `trip_id` | string | yes | `A-2026-001` | External trip identifier. |
| `line_code` | string | yes | `A` | Must exist in `lines.csv`. |
| `service_id` | string | yes | `WKD` | Service/calendar key. |
| `train_number` | string | no | `104` | Train label shown in details. |
| `headsign` | string | no | `Borj Cédria` | Optional destination text. |
| `direction_id` | 0/1 | no | `0` | Optional direction flag. |
| `station_id` | string | yes | `TVL` | Must exist in `stations.csv`. |
| `stop_sequence` | integer | yes | `1` | Must be strictly increasing per trip. |
| `arrival_time` | `HH:MM` | yes | `23:30` | Local timetable time. |
| `departure_time` | `HH:MM` | yes | `23:32` | Local timetable time. |

### Overnight handling

If a later stop has a clock value smaller than a previous stop (e.g. `23:30` then `00:11`),
import normalization must increment day offset and compute absolute minutes accordingly.

## 4) `fares.csv`

| Column | Type | Required | Example | Notes |
|---|---|---:|---|---|
| `line_code` | string | no | `A` | Optional fare scoping by line. |
| `origin_station_id` | string | no | `TVL` | Optional origin station scope. |
| `destination_station_id` | string | no | `HLI` | Optional destination station scope. |
| `currency` | string | yes | `TND` | ISO-like currency code. |
| `amount` | decimal | yes | `1.500` | Non-negative fare amount. |
| `passenger_type` | string | no | `adult` | Defaults to `adult`. |

## Validation outcomes

Validation should output:

- row counts by source file,
- normalized row previews,
- errors and warnings (`import_issues`-compatible records),
- publish-blocking status (true if errors exist).
