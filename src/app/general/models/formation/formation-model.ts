import { ReadFormationDto } from './formation-dto';
import { IFormation } from '../../interfaces/formation';

export class FormationModel {
  static readFormationDtoImpl(formation: ReadFormationDto): IFormation {
    const returnObj: IFormation = {
      id: formation.id,
      agencyId: formation.agency_id,
      vehicleType: formation.vehicle_type,
      formationNumber: formation.formation_number,
      formationDescription: formation.formation_description,
      startDate: formation.start_date,
      endDate: formation.end_date,
      createdAt: formation.created_at,
      updatedAt: formation.updated_at
    };

    return returnObj;
  }
}
