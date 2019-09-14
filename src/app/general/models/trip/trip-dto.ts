import { ReadTimeDto } from '../time/time-dto';

export class ReadTripDto {
    id: string;
    service_id: string;
    operation_id: string;
    trip_number: string;
    trip_class_id: string;
    trip_name: string;
    trip_direction: 0 | 1;
    trip_block_id: string;
    depot_in: boolean;
    depot_out: boolean;
    calender_id: string;
    extra_calender_id: string;
    created_at: string;
    updated_at: string;
    times?: ReadTimeDto[]
}
