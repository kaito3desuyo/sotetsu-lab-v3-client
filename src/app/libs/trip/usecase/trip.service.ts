import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TripQuery } from '../infrastructure/queries/trip.query';
import { TripDetailsDto } from './dtos/trip-details.dto';

@Injectable({ providedIn: 'root' })
export class TripService {
    private readonly tripQuery = inject(TripQuery);

    findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
        forceReload?: boolean;
    }): Observable<TripDetailsDto[]> {
        return this.tripQuery.findManyByStationId(params);
    }
}
