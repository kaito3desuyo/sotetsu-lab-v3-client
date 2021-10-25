import { ReadTripOperationListDto } from '../trip-operation-list/trip-operation-list-dto';

/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle, id-denylist, id-match */
export class ReadOperationDto {
    id: string;
    calendar_id: string;
    operation_number: string;
    created_at: string;
    updated_at: string;
    trip_operation_lists?: ReadTripOperationListDto[];
}
