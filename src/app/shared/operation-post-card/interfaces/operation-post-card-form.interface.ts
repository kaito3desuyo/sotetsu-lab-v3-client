export interface IOperationPostCardForm {
    agencyId: string;
    formationOrVehicleNumber: string;
    operationNumber: string;
    timeSetting: 'currentTime' | 'specifiedTime';
    sightingTime?: string;
}
