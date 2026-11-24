import { AgencyModel } from 'src/app/libs/agency/infrastructure/models/agency.model';

export interface VehicleModificationModel {
    id: string;
    vehicleId: string;
    modifiedOn: string | null;
    kind: string;
    value: string | null;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VehicleFormationModel {
    carNumber: number;
    vehicle?: {
        vehicleNumber: string;
        modifications?: VehicleModificationModel[];
    };
}

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
    vehicleFormations?: VehicleFormationModel[];
}
