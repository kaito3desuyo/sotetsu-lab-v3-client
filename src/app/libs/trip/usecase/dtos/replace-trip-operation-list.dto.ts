import { Exclude, Expose } from 'class-transformer';

export class ReplaceTripOperationListDto {
    @Expose()
    id?: string;

    @Exclude()
    tripId: undefined;

    @Expose()
    operationId: string;

    @Expose()
    startStationId: string;

    @Expose()
    endStationId: string;

    @Exclude()
    startTimeId: undefined;

    @Exclude()
    endTimeId: undefined;

    @Expose()
    nextTripOperationListId?: string | null;
}
