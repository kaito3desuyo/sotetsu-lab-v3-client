import { TripClass } from './trip_class';

export interface Service {
  id: string;
  service_name: string;
  service_description: string;
  created_at: string;
  updated_at: string;
  trip_classes: TripClass[];
}
