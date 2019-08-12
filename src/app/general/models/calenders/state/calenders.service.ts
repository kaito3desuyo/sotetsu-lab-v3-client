import { Injectable } from '@angular/core';
import { ID } from '@datorama/akita';
import { CalendersStore } from './calenders.store';
import { tap } from 'rxjs/operators';
import { CalenderApiService } from 'src/app/general/api/calender-api.service';
import { CurrentParamsStore } from '../../current-params/current-params.store';
import { ICalender } from 'src/app/general/interfaces/calender';

@Injectable({ providedIn: 'root' })
export class CalendersService {
  constructor(
    private calendersStore: CalendersStore,
    private currentParamsStore: CurrentParamsStore,
    private calenderApiService: CalenderApiService
  ) {}

  get() {
    return this.calenderApiService.getCalenders().pipe(
      tap(entities => {
        this.calendersStore.set(entities);
        this.currentParamsStore.update({ calenderId: 'fuga' });
      })
    );
  }

  add(calender: ICalender) {
    this.calendersStore.add(calender);
  }

  update(id, calender: Partial<ICalender>) {
    this.calendersStore.update(id, calender);
  }

  remove(id: ID) {
    this.calendersStore.remove(id);
  }
}
