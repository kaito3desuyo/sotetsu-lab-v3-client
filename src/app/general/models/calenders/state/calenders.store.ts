import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { ICalender } from 'src/app/general/interfaces/calender';

export interface CalendersState extends EntityState<ICalender> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'calenders' })
export class CalendersStore extends EntityStore<CalendersState> {
  constructor() {
    super();
  }
}
