import { Injectable } from '@angular/core';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { IOperation } from 'src/app/general/interfaces/operation';

@Injectable()
export class OperationSightingAddFormService {
  constructor(
    private formationApi: FormationApiService,
    private operationApi: OperationApiService
  ) {}

  async getCurrentFormationByVehicleNumber(
    agencyId: string,
    vehicleNumber: string,
    date: string
  ): Promise<IFormation[]> {
    const result = await this.formationApi
      .searchFormationsByVehicleNumber({
        agencyId,
        number: vehicleNumber,
        date
      })
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
