/* tslint:disable: variable-name */
export class ReadCalendarDto {
  id: string;
  service_id: string;
  calendar_name: string;
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
}
