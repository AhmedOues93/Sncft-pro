import type { ImportRepository } from '../repositories/importRepository.js';

export class SchedulePublishService {
  constructor(private readonly importRepository: ImportRepository) {}

  async publishImport(importId: string, force = false) {
    const importRow = await this.importRepository.getImportById(importId);
    if (!importRow) {
      return { statusCode: 404, body: { error: 'Import not found' } };
    }

    const summary = importRow.summary ?? {};
    const errorsCount = Number(summary.errorsCount ?? 0);

    if (importRow.status === 'failed' || errorsCount > 0) {
      return {
        statusCode: 409,
        body: { error: 'Cannot publish failed imports or imports with errors' },
      };
    }

    if (importRow.status === 'needs_review' && !force) {
      return {
        statusCode: 409,
        body: { error: 'Import needs review. Re-submit with force=true to publish.' },
      };
    }

    const previous = await this.importRepository.getActiveImportByLineSeason(importRow.line_code, importRow.season, importId);

    await this.importRepository.publishImport(importId, previous?.id ?? null);

    return {
      statusCode: 200,
      body: {
        importId,
        status: 'published',
        previousActiveImportId: previous?.id ?? null,
      },
    };
  }

  async rollbackImport(importId: string) {
    const importRow = await this.importRepository.getImportById(importId);
    if (!importRow) {
      return { statusCode: 404, body: { error: 'Import not found' } };
    }

    const previousId = importRow.previous_active_import_id;
    if (!previousId) {
      return {
        statusCode: 409,
        body: { error: 'No previous active import available for rollback' },
      };
    }

    await this.importRepository.rollbackImport(importId, previousId);

    return {
      statusCode: 200,
      body: {
        importId,
        status: 'rolled_back',
        restoredImportId: previousId,
      },
    };
  }
}
