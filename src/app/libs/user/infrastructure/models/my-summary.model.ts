import { SightingCorroboration } from 'src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto';

export interface MySummaryModel {
    sightingCount: number;
    invalidatedCount: number;
    firstSightingAt: string | null;
    lastSightingAt: string | null;
    corroboration: Record<SightingCorroboration, number>;
}
