import { ICalendar } from '../../interfaces/calendar';
import { ReadCalendarDto } from './calendar-dto';

export class CalendarModel {
  private initialValue: ICalendar = {
    id: '',
    serviceId: '',
    calendarName: '',
    sunday: null,
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    startDate: '',
    endDate: '',
    createdAt: '',
    updatedAt: ''
  };

  private state = { ...this.initialValue };

  constructor(value?: Partial<ICalendar>) {
    if (value) {
      this.state = { ...this.initialValue, ...value };
    }
  }

  get value() {
    return this.state;
  }

  static readCalendarDtoImpl(calendar: ReadCalendarDto): ICalendar {
    return {
      id: calendar.id,
      serviceId: calendar.service_id,
      calendarName: calendar.calendar_name,
      sunday: calendar.sunday,
      monday: calendar.monday,
      tuesday: calendar.tuesday,
      wednesday: calendar.wednesday,
      thursday: calendar.thursday,
      friday: calendar.friday,
      saturday: calendar.saturday,
      startDate: calendar.start_date,
      endDate: calendar.end_date,
      createdAt: calendar.created_at,
      updatedAt: calendar.updated_at
    };
  }
}
