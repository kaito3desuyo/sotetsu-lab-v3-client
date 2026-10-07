import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StationQuery } from '../infrastructure/queries/station.query';
import { StationDetailsDto } from './dtos/station-details.dto';

@Injectable({ providedIn: 'root' })
export class StationService {
    private readonly stationQuery = inject(StationQuery);

    findMany(params?: {
        forceReload?: boolean;
    }): Observable<StationDetailsDto[]> {
        return this.stationQuery.findMany(params);
    }
}
