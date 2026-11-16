import { AgencyModel } from 'src/app/libs/agency/infrastructure/models/agency.model';

export interface FormationModel {
    id: string;
    agencyId: string;
    vehicleType: string;
    formationNumber: string;
    formationDescription: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
    agency?: AgencyModel;
}
