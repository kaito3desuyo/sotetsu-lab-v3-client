import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export interface ServiceAgenciesDto {
    service: ServiceDetailsDto;

    agencies: AgencyDetailsDto[];
}
