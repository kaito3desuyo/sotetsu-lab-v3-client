export interface CreateTripOperationListDto {
    operationId: string;
    startStationId: string;
    endStationId: string;
    nextTripOperationListId?: string | null;
}
