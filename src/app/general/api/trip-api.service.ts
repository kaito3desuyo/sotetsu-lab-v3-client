import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ITrip } from '../interfaces/trip';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { ReadTripDto } from '../models/trip/trip-dto';
import { TripModel } from '../models/trip/trip-model';
import { ReadTripClassDto } from '../models/trip-class/trip-class-dto';
import {
    ReadTripBlockDto,
    CreateTripBlockDto,
    UpdateTripBlockDto
} from '../models/trip-block/trip-block-dto';

@Injectable({
    providedIn: 'root'
})
export class TripApiService {
    private apiUrl = environment.apiUrl + '/v1/trips';

    constructor(private http: HttpClient) {}

    addTripToTripBlockById(
        tripId: string,
        tripBlockId: string
    ): Observable<any> {
        return this.http.patch(
            this.apiUrl + '/' + tripId + '/add-to-block/' + tripBlockId,
            null
        );
    }

    removeTripFromTripBlockById(tripId: string): Observable<any> {
        return this.http.patch(
            this.apiUrl + '/' + tripId + '/remove-from-block',
            null
        );
    }

    deleteTripById(id: string): Observable<any> {
        return this.http.delete(this.apiUrl + '/' + id);
    }

    getTripBlockById(id: string): Observable<{ trip_block: ReadTripBlockDto }> {
        return this.http
            .get(this.apiUrl + '/blocks/' + id)
            .pipe(map((data: { trip_block: ReadTripBlockDto }) => data));
    }

    addTripBlocks(
        body: CreateTripBlockDto[]
    ): Observable<{ trip_blocks: ReadTripBlockDto[] }> {
        return this.http
            .post(this.apiUrl + '/blocks', body)
            .pipe(map((data: { trip_blocks: ReadTripBlockDto[] }) => data));
    }

    updateTripBlockById(
        id: string,
        body: UpdateTripBlockDto
    ): Observable<{ trip_block: ReadTripBlockDto }> {
        return this.http
            .put(this.apiUrl + '/blocks/' + id, body)
            .pipe(map((data: { trip_block: ReadTripBlockDto }) => data));
    }

    getTripClasses(query: {
        service_id?: string;
    }): Observable<{ trip_classes: ReadTripClassDto[] }> {
        return this.http
            .get(this.apiUrl + '/classes', {
                params: query
            })
            .pipe(map((data: { trip_classes: ReadTripClassDto[] }) => data));
    }

    searchTrips(query: {
        calendar_id?: string;
        trip_direction?: '0' | '1';
    }): Observable<ITrip[]> {
        return this.http
            .get(this.apiUrl + '/search', {
                params: query
            })
            .pipe(
                map((data: ReadTripDto[]) => {
                    return data.map(result =>
                        TripModel.readTripDtoImpl(result)
                    );
                })
            );
    }

    searchTripsByBlocks(query: {
        calendar_id?: string;
        trip_direction?: '0' | '1';
        trip_block_id?: string;
    }): Observable<{ trip_blocks: ReadTripBlockDto[] }> {
        return this.http
            .get(this.apiUrl + '/search/by-blocks', {
                params: query
            })
            .pipe(map((data: { trip_blocks: ReadTripBlockDto[] }) => data));
    }
}
