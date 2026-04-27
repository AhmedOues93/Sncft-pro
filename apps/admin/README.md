# SNCFT Admin Dashboard (MVP)

Static French admin dashboard (HTML/JS) used for CSV import workflow testing.

## Start

```bash
cd apps/admin
npm run dev
```

Open http://localhost:4173 and use backend API endpoints.

## Workflow supported

- Coller CSV horaires → Prévisualiser
- Enregistrer import horaires brouillon
- Coller CSV tarifs → Prévisualiser
- Enregistrer import tarifs brouillon
- Publish/Rollback are exposed by API endpoints for integration with richer UI.
