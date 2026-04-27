const REQUIRED_COLUMNS = [
  'line',
  'line_name',
  'season',
  'valid_from',
  'valid_to',
  'direction',
  'train_number',
  'service_code',
  'station_order',
  'station',
];

function parseCsvLine(line) {
  return line.split(',').map((value) => value.trim());
}

function normalizeHeader(header) {
  return header.trim().toLowerCase();
}

function toDisplayTime(raw) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw).trim());
  if (!match) {
    return raw;
  }
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function getStopBaseTime(row) {
  return row.arrival_time || row.departure_time || row.time || '';
}

function parseDateStrict(value) {
  const str = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return null;
  }
  const date = new Date(`${str}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseScheduleCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

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
  return String(name || '')
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
  const byTripKey = new Map();

  for (const row of rows) {
    const tripKey = `${row.line}|${row.train_number}|${row.service_code}|${row.direction}|${row.valid_from}|${row.valid_to}`;
    if (!byTripKey.has(tripKey)) {
      byTripKey.set(tripKey, []);
    }
    byTripKey.get(tripKey).push(row);
  }

  const normalizedStops = [];

  for (const [tripKey, tripRows] of byTripKey.entries()) {
    tripRows.sort((a, b) => Number(a.station_order) - Number(b.station_order));

    let dayOffset = 0;
    let previousDepartureMinutes = null;

    for (const row of tripRows) {
      const arrivalRaw = row.arrival_time || row.time || row.departure_time;
      const departureRaw = row.departure_time || row.time || row.arrival_time;

      const arrivalBase = normalizeTime(arrivalRaw);
      const departureBase = normalizeTime(departureRaw);

      if (previousDepartureMinutes !== null && arrivalBase < previousDepartureMinutes % 1440) {
        dayOffset += 1;
      }

      const arrivalMinutes = arrivalBase + dayOffset * 1440;
      let departureMinutes = departureBase + dayOffset * 1440;

      if (departureMinutes < arrivalMinutes) {
        departureMinutes += 1440;
      }

      normalizedStops.push({
        tripKey,
        lineCode: row.line,
        lineName: row.line_name,
        season: row.season,
        serviceCode: row.service_code,
        direction: row.direction,
        trainNumber: row.train_number,
        stationOrder: Number(row.station_order),
        stationName: row.station,
        stationNameNormalized: normalizeStationName(row.station),
        arrivalDisplayTime: toDisplayTime(arrivalRaw),
        departureDisplayTime: toDisplayTime(departureRaw),
        arrivalMinutes,
        departureMinutes,
        dayOffset,
        validFrom: row.valid_from,
        validTo: row.valid_to,
      });

      previousDepartureMinutes = departureMinutes;
    }
  }

  return normalizedStops;
}

function validateRequiredFields(row, rowNumber, issues) {
  for (const field of REQUIRED_COLUMNS) {
    if (!String(row[field] || '').trim()) {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: field,
        code: 'REQUIRED_FIELD_MISSING',
        message: `${field} is required`,
      });
    }
  }
}

function buildNormalizedImportOutput(validRows) {
  const tripMap = new Map();
  const calendarMap = new Map();

  for (const row of validRows) {
    if (!tripMap.has(row.tripKey)) {
      tripMap.set(row.tripKey, {
        externalTripId: row.tripKey,
        lineCode: row.lineCode,
        serviceCode: row.serviceCode,
        trainNumber: row.trainNumber,
        direction: row.direction,
        headsign: row.stationName,
        validFrom: row.validFrom,
        validTo: row.validTo,
      });
    }

    if (!calendarMap.has(row.serviceCode)) {
      calendarMap.set(row.serviceCode, {
        serviceCode: row.serviceCode,
        validFrom: row.validFrom,
        validTo: row.validTo,
        season: row.season,
      });
    }
  }

  return {
    trips: Array.from(tripMap.values()),
    stopTimes: validRows.map((row) => ({
      externalTripId: row.tripKey,
      stationName: row.stationName,
      stationOrder: row.stationOrder,
      arrivalDisplayTime: row.arrivalDisplayTime,
      departureDisplayTime: row.departureDisplayTime,
      arrivalMinutes: row.arrivalMinutes,
      departureMinutes: row.departureMinutes,
      dayOffset: row.dayOffset,
    })),
    calendars: Array.from(calendarMap.values()),
  };
}

export function validateScheduleRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    validateRequiredFields(row, rowNumber, issues);

    const fromDate = parseDateStrict(row.valid_from);
    const toDate = parseDateStrict(row.valid_to);
    if (!fromDate || !toDate || fromDate > toDate) {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: 'valid_from,valid_to',
        code: 'INVALID_DATE_RANGE',
        message: 'valid_from and valid_to must be valid YYYY-MM-DD with valid_from <= valid_to',
      });
    }

    const stationOrder = Number(row.station_order);
    if (!Number.isInteger(stationOrder) || stationOrder <= 0) {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: 'station_order',
        code: 'INVALID_STATION_ORDER',
        message: 'station_order must be a positive integer',
      });
    }

    try {
      normalizeTime(getStopBaseTime(row));
    } catch {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: 'arrival_time/departure_time/time',
        code: 'INVALID_TIME',
        message: 'At least one valid HH:MM time is required',
      });
    }
  });

  const validRows = issues.some((issue) => issue.severity === 'error') ? [] : detectOvernightStops(rows);

  if (validRows.length > 0) {
    const rowsByTrip = new Map();

    for (const row of validRows) {
      if (!rowsByTrip.has(row.tripKey)) {
        rowsByTrip.set(row.tripKey, []);
      }
      rowsByTrip.get(row.tripKey).push(row);
    }

    for (const [tripKey, tripRows] of rowsByTrip.entries()) {
      tripRows.sort((a, b) => a.stationOrder - b.stationOrder);
      for (let index = 1; index < tripRows.length; index += 1) {
        const prev = tripRows[index - 1];
        const curr = tripRows[index];

        if (curr.stationOrder <= prev.stationOrder || curr.arrivalMinutes < prev.departureMinutes) {
          issues.push({
            severity: 'error',
            sourceFile: 'schedules.csv',
            code: 'NON_CHRONOLOGICAL_STOP_ORDER',
            message: `Trip ${tripKey} has non-chronological stop order`,
            context: {
              previousStationOrder: prev.stationOrder,
              currentStationOrder: curr.stationOrder,
              previousDepartureMinutes: prev.departureMinutes,
              currentArrivalMinutes: curr.arrivalMinutes,
            },
          });
          break;
        }
      }
    }
  }

  return {
    validRows: issues.some((issue) => issue.severity === 'error') ? [] : validRows,
    issues,
    normalizedOutput: issues.some((issue) => issue.severity === 'error') ? undefined : buildNormalizedImportOutput(validRows),
  };
}
