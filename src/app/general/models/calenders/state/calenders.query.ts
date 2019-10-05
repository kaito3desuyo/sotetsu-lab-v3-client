import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { CalendersStore, CalendersState } from './calenders.store';

@Injectable({ providedIn: 'root' })
export class CalendersQuery extends QueryEntity<CalendersState> {

  constructor(protected store: CalendersStore) {
    super(store);
  }

}
