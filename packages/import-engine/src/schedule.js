function parseCsvLine(line) {
  return line.split(',').map((value) => value.trim());
}

export function parseScheduleCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

export function normalizeStationName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeTime(timeValue) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(timeValue).trim());
  if (!match) {
    throw new Error(`Invalid time format: ${timeValue}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 47 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: ${timeValue}`);
  }

  return hours * 60 + minutes;
}

export function detectOvernightStops(rows) {
  const byTrip = new Map();

  for (const row of rows) {
    const tripId = row.trip_id;
    if (!byTrip.has(tripId)) {
      byTrip.set(tripId, []);
    }
    byTrip.get(tripId).push(row);
  }

  const normalized = [];

  for (const tripRows of byTrip.values()) {
    tripRows.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

    let dayOffset = 0;
    let previousDeparture = -1;

    for (const row of tripRows) {
      const arrivalRaw = normalizeTime(row.arrival_time);
      const departureRaw = normalizeTime(row.departure_time);

      if (previousDeparture >= 0 && arrivalRaw < previousDeparture % (24 * 60)) {
        dayOffset += 1;
      }

      const arrivalMinutes = arrivalRaw + dayOffset * 24 * 60;
      let departureMinutes = departureRaw + dayOffset * 24 * 60;

      if (departureMinutes < arrivalMinutes) {
        departureMinutes += 24 * 60;
      }

      normalized.push({
        tripId: row.trip_id,
        lineCode: row.line_code,
        serviceId: row.service_id,
        stationId: row.station_id,
        stopSequence: Number(row.stop_sequence),
        arrivalTimeRaw: row.arrival_time,
        departureTimeRaw: row.departure_time,
        arrivalMinutes,
        departureMinutes,
        dayOffset,
        trainNumber: row.train_number || undefined,
        headsign: row.headsign || undefined,
        directionId: row.direction_id === '1' ? 1 : row.direction_id === '0' ? 0 : undefined,
      });

      previousDeparture = departureMinutes;
    }
  }

  return normalized;
}

export function validateScheduleRows(rows) {
  const issues = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;

    if (!row.trip_id) {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: 'trip_id',
        code: 'TRIP_ID_REQUIRED',
        message: 'trip_id is required',
      });
    }

    if (!row.station_id) {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: 'station_id',
        code: 'STATION_ID_REQUIRED',
        message: 'station_id is required',
      });
    }
  }

  const validRows = issues.some((issue) => issue.severity === 'error') ? [] : detectOvernightStops(rows);

  return { validRows, issues };
}
