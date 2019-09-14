import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ReadVehicleDto } from '../models/vehicle/vehicle-dto';
import { VehicleModel } from '../models/vehicle/vehicle-model';

@Injectable({
  providedIn: 'root'
})
export class VehicleApiService {
  private apiUrl = environment.apiUrl + '/v1/vehicles';

  constructor(private http: HttpClient) {}

  searchVehicles(query: { number?: string; relations?: string[] }) {
    return this.http.post(this.apiUrl + '/search', query).pipe(
      map((data: ReadVehicleDto[]) => {
        return data.map(result => {
          return VehicleModel.readVehicleDtoImpl(result);
        });
      })
    );
  }
}
