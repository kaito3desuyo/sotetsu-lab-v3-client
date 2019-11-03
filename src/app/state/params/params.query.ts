import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { ParamsStore, ParamsState } from './params.store';

@Injectable({ providedIn: 'root' })
export class ParamsQuery extends Query<ParamsState> {
  calendar$ = this.select('calendarId');
  constructor(protected store: ParamsStore) {
    super(store);
  }
}
