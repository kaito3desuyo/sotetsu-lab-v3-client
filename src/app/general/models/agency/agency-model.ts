import { ReadAgencyDto } from './agency-dto';
import { IAgency } from '../../interfaces/agency';

export class AgencyModel {
    static readAgencyDtoImpl(data: ReadAgencyDto): IAgency {
        const parsed: IAgency = {
            id: data.id,
            agencyNumber: data.agency_number,
            parentAgencyNumber: data.parent_agency_number,
            agencyOfficialName: data.agency_official_name,
            agencyName: data.agency_name,
            agencyType: data.agency_type,
            agencyUrl: data.agency_url,
            agencyPhone: data.agency_phone,
            agencyFareUrl: data.agency_fare_url,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        return parsed;
    }
}
