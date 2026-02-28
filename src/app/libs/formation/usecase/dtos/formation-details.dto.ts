import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';

export class FormationDetailsDto {
    @Expose({ name: 'id' })
    formationId: string;

    @Expose()
    agencyId?: string;

    @Expose()
    vehicleType?: string;

    @Expose()
    formationNumber?: string;

    @Expose()
    formationDescription?: string;

    @Expose()
    startDate?: string;

    @Expose()
    endDate?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;

    @Expose()
    @Type(() => AgencyDetailsDto)
    agency?: AgencyDetailsDto;
}
