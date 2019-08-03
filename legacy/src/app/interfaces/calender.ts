import { Operation } from './operation';
import { Service } from './service';

export interface Calender {
  id: string;
  service_id: string;
  calender_name: string;
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  service: Service;
  operations: Operation[];
}
