import { Expose } from 'class-transformer';

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
}
