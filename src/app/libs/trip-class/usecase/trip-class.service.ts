import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto';

@Injectable({ providedIn: 'root' })
export class TripClassService {
    constructor(private readonly tripClassQuery: TripClassQuery) {}

    findMany_V3(params: {
        forceReload?: boolean;
    }): Observable<TripClassDetailsDto[]> {
        return this.tripClassQuery.findMany_V3(params);
    }
}
