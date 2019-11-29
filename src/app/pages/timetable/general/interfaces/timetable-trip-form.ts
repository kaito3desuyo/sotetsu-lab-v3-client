export interface ITimetableTripForm {
    id?: string;
    tripNumber: string;
    tripOperationListId?: string;
    operationId: string;
    tripClassId: string;
    depotIn: boolean;
    depotOut: boolean;
    times: {
        id?: string;
        stopType: string;
        stationId: string;
        stopId?: string;
        arrivalTime?: string;
        departureTime?: string;
    }[];
}
