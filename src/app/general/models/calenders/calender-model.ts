import { ICalender } from '../../interfaces/calender';
import { ReadCalenderDto } from './calender-dto';

export class CalenderModel {
  private initialValue: ICalender = {
    id: '',
    serviceId: '',
    calenderName: '',
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

  constructor(value?: Partial<ICalender>) {
    if (value) {
      this.state = { ...this.initialValue, ...value };
    }
  }

  get value() {
    return this.state;
  }

  static readCalenderDtoImpl(calender: ReadCalenderDto): ICalender {
    return {
      id: calender.id,
      serviceId: calender.service_id,
      calenderName: calender.calender_name,
      sunday: calender.sunday,
      monday: calender.monday,
      tuesday: calender.tuesday,
      wednesday: calender.wednesday,
      thursday: calender.thursday,
      friday: calender.friday,
      saturday: calender.saturday,
      startDate: calender.start_date,
      endDate: calender.end_date,
      createdAt: calender.created_at,
      updatedAt: calender.updated_at
    };
  }
}
