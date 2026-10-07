import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto';

@Injectable({ providedIn: 'root' })
export class TripClassService {
    private readonly tripClassQuery = inject(TripClassQuery);

    findMany(params: {
        forceReload?: boolean;
    }): Observable<TripClassDetailsDto[]> {
        return this.tripClassQuery.findMany(params);
    }
}
