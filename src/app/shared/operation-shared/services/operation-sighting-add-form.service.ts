import { Injectable } from '@angular/core';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { AgencyApiService } from 'src/app/general/api/agency-api.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { IAgency } from 'src/app/general/interfaces/agency';
import { tap, map } from 'rxjs/operators';
import { AgencyModel } from 'src/app/general/models/agency/agency-model';
import { FormationModel } from 'src/app/general/models/formation/formation-model';
import { OperationModel } from 'src/app/general/models/operation/operation-model';

@Injectable()
export class OperationSightingAddFormService {
  private agencies$: BehaviorSubject<IAgency[]> = new BehaviorSubject<
    IAgency[]
  >([]);

  constructor(
    private agencyApi: AgencyApiService,
    private formationApi: FormationApiService,
    private operationApi: OperationApiService
  ) {}

  getAgencies(): Observable<IAgency[]> {
    return this.agencies$.asObservable();
  }

  setAgencies(array: IAgency[]): void {
    this.agencies$.next(array);
  }

  fetchAgencies(): Observable<void> {
    return this.agencyApi.getAgencies().pipe(
      tap(data => {
        const agencies = data.agencies.map(result =>
          AgencyModel.readAgencyDtoImpl(result)
        );
        this.setAgencies(agencies);
      }),
      map(() => null)
    );
  }

  async getCurrentFormationByVehicleNumber(
    agencyId: string,
    vehicleNumber: string,
    date: string
  ): Promise<IFormation[]> {
    const result = await this.formationApi
      .searchFormations({
        agency_id: agencyId,
        vehicle_number: vehicleNumber,
        date
      })
      .pipe(
        map(data => {
          return data.formations.map(result =>
            FormationModel.readFormationDtoImpl(result)
          );
        })
      )
      .toPromise();

    return result;
  }

  async getOperationByCalenderIdAndOperationNumber(
    calenderId: string,
    operationNumber: string
  ): Promise<IOperation[]> {
    const result = await this.operationApi
      .searchOperations({
        calender_id: calenderId,
        operation_number: operationNumber
      })
      .pipe(
        map(data => {
          return data.operations.map(result =>
            OperationModel.readOperationDtoImpl(result)
          );
        })
      )
      .toPromise();

    return result;
  }

  async addOperationSighting(
    formationId: string,
    operationId: string,
    sightingTime: string
  ) {
    const result = await this.operationApi
      .addOperationSighting({
        formationId,
        operationId,
        sightingTime
      })
      .toPromise();

    return result;
  }
}
