import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class ServiceStationsDto {
    service: ServiceDetailsDto;
    stations: StationDetailsDto[];
}
