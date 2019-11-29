import { ReadTripOperationListDto } from '../trip-operation-list/trip-operation-list-dto';

/* tslint:disable: variable-name */
export class ReadOperationDto {
    id: string;
    calendar_id: string;
    operation_number: string;
    created_at: string;
    updated_at: string;
    trip_operation_lists?: ReadTripOperationListDto[];
}
