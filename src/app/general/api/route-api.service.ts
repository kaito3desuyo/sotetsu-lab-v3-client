import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ReadRouteDto } from '../models/routes/route-dto';
import { RouteModel } from '../models/routes/route-model';

@Injectable({
    providedIn: 'root'
})
export class RouteApiService {
    private apiUrl = environment.apiUrl + '/v1/routes';

    constructor(private http: HttpClient) {}

    getRoutesAllStations(): Observable<any> {
        return this.http.get(this.apiUrl + '/all/stations').pipe(
            map(data => {
                return (data as ReadRouteDto[]).map(result => {
                    return RouteModel.readRouteDtoImpl(result);
                });
            })
        );
    }
}
