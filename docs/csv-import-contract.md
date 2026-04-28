# CSV Import Contract

## Schedules CSV

Accepted schedule headers (normalized):

- `line` or `line_code`
- `line_name`
- `season`
- `valid_from`
- `valid_to`
- `direction`
- `train_number`
- `service_code` (or `service_id`)
- `station_order` (or `stop_sequence`)
- `station`
- `arrival_time`
- `departure_time`
- `time` (fallback used for arrival/departure)

## Fares CSV

Accepted fare headers:

- `line` or `line_code`
- `origin` or `origin_station_id`
- `destination` or `destination_station_id`
- `amount` or `fare`
- `currency`

## Validation behavior

- Required schedule fields: line, station, station_order.
- Times must be `HH:mm` and support overnight rollover.
- Chronological stop order is normalized with day offsets.
- Issues are returned as `error`, `warning`, `info`.
