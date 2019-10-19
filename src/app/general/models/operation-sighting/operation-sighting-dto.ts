import { ReadOperationDto } from '../operation/operation-dto';
import { ReadFormationDto } from '../formation/formation-dto';

/* tslint:disable: variable-name */
export class ReadOperationSightingDto {
  id: string;
  formation_id: string;
  operation_id: string;
  circulated_operation_id?: string;
  sighting_time: string;
  created_at: string;
  updated_at: string;
  formation?: ReadFormationDto;
  operation?: ReadOperationDto;
  circulated_operation?: ReadOperationDto;
}

export class CreateOperationSightingDto {
  formation_id: string;
  operation_id: string;
  sighting_time: string;
}
