import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { CurrentParamsStore, CurrentParamsState } from './current-params.store';

@Injectable({ providedIn: 'root' })
export class CurrentParamsQuery extends Query<CurrentParamsState> {
  day$ = this.select('day');
  calender$ = this.select('calender');
  value = this.getValue();

  constructor(protected store: CurrentParamsStore) {
    super(store);
  }
}
