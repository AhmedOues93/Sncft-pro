import { normalizeStationName } from '@sncft/import-engine';

import type { ActiveScheduleRepositoryLike } from '../../repositories/activeScheduleRepository.js';

export class StationSearchService {
  constructor(private readonly repository: ActiveScheduleRepositoryLike) {}

  async searchStations(query: string) {
    const q = normalizeStationName(query);
    if (!q) {
      return [];
    }

    const stations = await this.repository.loadStations();

    return stations
      .filter((station) => {
        const names = [station.normalizedName, ...station.aliases.map((alias) => normalizeStationName(alias))];
        return names.some((name) => name.includes(q));
      })
      .map((station) => ({
        id: station.id,
        name: station.name,
        aliases: station.aliases,
        score: station.normalizedName.startsWith(q) ? 2 : 1,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 20)
      .map(({ score: _score, ...station }) => station);
  }
}
