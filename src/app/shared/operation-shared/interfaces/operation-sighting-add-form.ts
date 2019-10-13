export interface IOperationSightingAddForm {
  agencyId: string;
  formationOrVehicleNumber: string;
  operationNumber: string;
  timeSetting: 'currentTime' | 'specifiedTime';
  sightingTime?: string;
}
