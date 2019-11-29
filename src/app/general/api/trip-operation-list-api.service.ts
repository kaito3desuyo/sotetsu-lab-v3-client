import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    ReadTripOperationListDto,
    UpdateTripOperationListDto
} from '../models/trip-operation-list/trip-operation-list-dto';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class TripOperationListApiService {
    private apiUrl = environment.apiUrl + '/v1/trip-operation-lists';

    constructor(private http: HttpClient) {}

    searchTripOperationLists(query: {
        operation_id?: string;
    }): Observable<{ trip_operation_lists: ReadTripOperationListDto[] }> {
        return this.http
            .get(this.apiUrl + '/search', {
                params: query
            })
            .pipe(
                map(
                    (data: {
                        trip_operation_lists: ReadTripOperationListDto[];
                    }) => data
                )
            );
    }

    patchTripOperationListById(
        id: string,
        body: Partial<UpdateTripOperationListDto>
    ): Observable<any> {
        return this.http.patch(this.apiUrl + '/' + id, body);
    }
}
