import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReadAgencyDto } from '../models/agency/agency-dto';

@Injectable({
    providedIn: 'root',
})
export class AgencyApiService {
    private apiUrl = environment.apiUrl + '/v1/agencies';

    constructor(private http: HttpClient) {}

    getAgencies(): Observable<{ agencies: ReadAgencyDto[] }> {
        return this.http
            .get(this.apiUrl)
            .pipe(map((data: { agencies: ReadAgencyDto[] }) => data));
    }
}
