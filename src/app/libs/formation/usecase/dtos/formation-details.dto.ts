import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';

export interface VehicleModificationDto {
    modifiedOn: string | null;
    kind: string;
    value: string | null;
    description: string | null;
}

export interface VehicleFormationDto {
    carNumber: number;
    vehicle?: {
        vehicleNumber: string;
        modifications?: VehicleModificationDto[];
    };
}

export interface FormationDetailsDto {
    formationId: string;

    agencyId: string;

    vehicleType: string;

    formationNumber: string;

    formationDescription: string | null;

    startDate: string | null;

    endDate: string | null;

    createdAt: string;

    updatedAt: string;

    agency?: AgencyDetailsDto;

    vehicleFormations?: VehicleFormationDto[];
}
