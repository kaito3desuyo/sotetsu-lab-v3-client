import { Expose } from 'class-transformer';

export class AgencyDetailsDto {
    @Expose({ name: 'id' })
    agencyId: string;

    @Expose()
    agencyNumber?: string;

    @Expose()
    parentAgencyNumber?: string;

    @Expose()
    agencyOfficialName?: string;

    @Expose()
    agencyName?: string;

    @Expose()
    agencyType?: number;

    @Expose()
    agencyUrl?: string;

    @Expose()
    agencyPhone?: string;

    @Expose()
    agencyFareUrl?: string;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;
}
