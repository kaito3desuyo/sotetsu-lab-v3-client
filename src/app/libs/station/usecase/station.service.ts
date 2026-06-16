import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StationQuery } from '../infrastructure/queries/station.query';
import { StationDetailsDto } from './dtos/station-details.dto';

@Injectable({ providedIn: 'root' })
export class StationService {
    constructor(private readonly stationQuery: StationQuery) {}

    findMany_V3(params?: {
        forceReload?: boolean;
    }): Observable<StationDetailsDto[]> {
        return this.stationQuery.findMany_V3(params);
    }
}
