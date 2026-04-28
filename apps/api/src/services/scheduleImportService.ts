import { createHash } from 'node:crypto';

import { parseScheduleCsv, validateScheduleRows } from '@sncft/import-engine';

import type { ImportRepository } from '../repositories/importRepository.js';

function inferLineAndSeason(rows: Array<Record<string, string>>) {
  const first = rows[0] ?? {};
  return {
    lineCode: String(first.line || 'UNKNOWN').trim() || 'UNKNOWN',
    season: String(first.season || 'UNSPECIFIED').trim() || 'UNSPECIFIED',
  };
}

export class ScheduleImportService {
  constructor(private readonly importRepository: ImportRepository) {}

  async persistScheduleImport(csvText: string, sourceFilename = 'uploaded_schedule.csv') {
    let rows: Array<Record<string, string>> = [];
    let validation;

    try {
      rows = parseScheduleCsv(csvText);
      validation = validateScheduleRows(rows);
    } catch (error) {
      const fallbackIssue = {
        severity: 'error' as const,
        sourceFile: sourceFilename,
        code: 'CSV_PARSE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to parse CSV payload',
      };

      const { lineCode, season } = inferLineAndSeason(rows);
      const summary = {
        totalRows: 0,
        tripsCount: 0,
        stopTimesCount: 0,
        calendarsCount: 0,
        warningsCount: 0,
        errorsCount: 1,
      };

      const inserted = await this.importRepository.createDraftImport({
        lineCode,
        season,
        sourceFilename,
        sourceChecksumSha256: createHash('sha256').update(csvText).digest('hex'),
        status: 'failed',
        summary,
        issues: [fallbackIssue],
        trips: [],
        stopTimes: [],
        calendars: [],
      });

      return {
        importId: inserted.id,
        importStatus: 'failed' as const,
        summary,
        issues: [fallbackIssue],
      };
    }

    const errorsCount = validation.issues.filter((issue) => issue.severity === 'error').length;
    const warningsCount = validation.issues.filter((issue) => issue.severity === 'warning').length;

    const normalized = validation.normalizedOutput ?? { trips: [], stopTimes: [], calendars: [] };
    const summary = {
      totalRows: rows.length,
      tripsCount: normalized.trips.length,
      stopTimesCount: normalized.stopTimes.length,
      calendarsCount: normalized.calendars.length,
      warningsCount,
      errorsCount,
    };

    const status = errorsCount > 0 ? 'failed' : warningsCount > 0 ? 'needs_review' : 'ready';

    const { lineCode, season } = inferLineAndSeason(rows);

    const inserted = await this.importRepository.createDraftImport({
      lineCode,
      season,
      sourceFilename,
      sourceChecksumSha256: createHash('sha256').update(csvText).digest('hex'),
      status,
      summary,
      issues: validation.issues.map((issue) => ({
        sourceFile: issue.sourceFile ?? 'schedules.csv',
        rowNumber: issue.rowNumber ?? 0,
        fieldName: issue.fieldName ?? '',
        code: issue.code ?? 'VALIDATION_ISSUE',
        severity: issue.severity,
        message: issue.message,
      })),
      trips: normalized.trips.map((trip) => ({
        external_trip_id: trip.externalTripId,
        line_code: trip.lineCode,
        service_code: trip.serviceCode,
        train_number: trip.trainNumber,
        direction: trip.direction,
        headsign: trip.headsign,
        valid_from: trip.validFrom,
        valid_to: trip.validTo,
      })),
      stopTimes: normalized.stopTimes.map((stop) => ({
        external_trip_id: stop.externalTripId,
        station_name: stop.stationName,
        station_order: stop.stationOrder,
        arrival_display_time: stop.arrivalDisplayTime,
        departure_display_time: stop.departureDisplayTime,
        arrival_minutes: stop.arrivalMinutes,
        departure_minutes: stop.departureMinutes,
        day_offset: stop.dayOffset,
      })),
      calendars: normalized.calendars.map((calendar) => ({
        service_code: calendar.serviceCode,
        valid_from: calendar.validFrom,
        valid_to: calendar.validTo,
        season: calendar.season,
      })),
    });

    return {
      importId: inserted.id,
      importStatus: status,
      summary,
      issues: validation.issues,
    };
  }

  async getSavedImportPreview(importId: string) {
    const importRow = await this.importRepository.getImportById(importId);
    if (!importRow) {
      return null;
    }

    const [issues, previewData] = await Promise.all([
      this.importRepository.getImportIssues(importId),
      this.importRepository.getImportPreviewTrips(importId, 5),
    ]);

    const stopsByTrip = new Map<string, Array<Record<string, unknown>>>();
    for (const stop of previewData.stops) {
      const tripId = String(stop.external_trip_id);
      if (!stopsByTrip.has(tripId)) {
        stopsByTrip.set(tripId, []);
      }
      stopsByTrip.get(tripId)?.push({
        stationOrder: stop.station_order,
        stationName: stop.station_name,
        arrivalDisplayTime: stop.arrival_display_time,
        departureDisplayTime: stop.departure_display_time,
        dayOffset: stop.day_offset,
      });
    }

    return {
      importId,
      importStatus: importRow.status,
      summary: importRow.summary,
      issues: issues.map((issue) => ({
        severity: issue.severity,
        sourceFile: issue.source_file,
        rowNumber: issue.row_number,
        fieldName: issue.field_name,
        code: issue.code,
        message: issue.message,
        context: issue.context,
      })),
      preview: previewData.trips.map((trip) => ({
        externalTripId: trip.external_trip_id,
        lineCode: trip.line_code,
        trainNumber: trip.train_number,
        direction: trip.direction,
        serviceCode: trip.service_code,
        stops: stopsByTrip.get(String(trip.external_trip_id)) ?? [],
      })),
    };
  }
}
