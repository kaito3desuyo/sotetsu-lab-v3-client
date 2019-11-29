import { ReadTripDto } from '../trip/trip-dto';
import { ReadOperationDto } from '../operation/operation-dto';
import { ReadTimeDto } from '../time/time-dto';
import { ReadStationDto } from '../station/station-dto';
/* tslint:disable:variable-name */
export class ReadTripOperationListDto {
    id: string;
    trip_id: string;
    operation_id: string;
    start_time_id: string;
    end_time_id: string;
    created_at: string;
    updated_at: string;
    trip?: ReadTripDto;
    operation?: ReadOperationDto;
    start_station?: ReadStationDto;
    end_station?: ReadStationDto;
    start_time?: ReadTimeDto;
    end_time?: ReadTimeDto;
}

export class CreateTripOperationListDto {
    trip_id?: string;
    operation_id?: string;
    start_time_id?: string;
    end_time_id?: string;
    start_station_id?: string;
    end_station_id?: string;
}

export class UpdateTripOperationListDto {
    id: string;
    trip_id: string;
    operation_id: string;
    start_time_id: string;
    end_time_id: string;
    start_station_id?: string;
    end_station_id?: string;
}
