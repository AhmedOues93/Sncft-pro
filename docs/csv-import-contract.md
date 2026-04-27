# CSV Import Contract (Phase 3)

This document defines the expected SNCFT schedule CSV contract and normalization behavior.

## Supported schedule CSV shape (`schedules.csv`)

The importer accepts SNCFT-style rows with columns like:

- `line`
- `line_name`
- `season`
- `valid_from`
- `valid_to`
- `direction`
- `train_number`
- `service_code`
- `station_order`
- `station`
- `arrival_time`
- `departure_time`
- `time`

At least one time field must be available per row (`arrival_time`, `departure_time`, or `time`).

## Required fields

Required row fields:

- `line`
- `line_name`
- `season`
- `valid_from`
- `valid_to`
- `direction`
- `train_number`
- `service_code`
- `station_order`
- `station`

Validation rules:

- `valid_from` and `valid_to` must be `YYYY-MM-DD` and `valid_from <= valid_to`.
- `station_order` must be a positive integer.
- time must parse as `HH:mm`.
- stops in the same trip must remain chronological after overnight normalization.

## Normalization behavior

### Station names

- trimmed
- accent/punctuation removed
- multiple spaces collapsed
- lowercased normalized key for station matching

### Time normalization

- display time is preserved as zero-padded `HH:mm` (`arrivalDisplayTime` / `departureDisplayTime`)
- import time is converted to minutes since service-day start (`arrivalMinutes` / `departureMinutes`)

### Overnight continuation

If times roll over midnight in a trip, day offset increases.

Example:

- stop 1: `23:30` => `1410`
- stop 2: `00:11` => `1451` (`+1` day offset)

## Partial trips are valid

The importer allows subset route segments, for example:

- Tunis Ville -> Hammam Lif
- Tunis Ville -> Jebel Jelloud

A trip does not need to traverse an entire line to be accepted.

## Normalized output (DB insertion shape)

The validator returns normalized output grouped as:

- `trips`
- `stopTimes`
- `calendars`

This output is designed for writing into DB tables (`trips`, `stop_times`, `calendars`) in a later phase.
