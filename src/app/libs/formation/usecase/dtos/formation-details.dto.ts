import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';

export interface FormationDetailsDto {
    formationId: string;

    agencyId?: string;

    vehicleType?: string;

    formationNumber?: string;

    formationDescription?: string;

    startDate?: string;

    endDate?: string;

    createdAt?: string;

    updatedAt?: string;

    agency?: AgencyDetailsDto;
}
