export interface IOperationSightingAddForm {
  agencyId: string;
  vehicleNumber: string;
  operationNumber: string;
  timeSetting: 'currentTime' | 'specifiedTime';
  sightingTime?: string;
}
