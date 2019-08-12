import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';

export interface CurrentParamsState {
  day: 'weekday' | 'holiday';
  calenderId: string;
  stationId: string;
}

export function createInitialState(): CurrentParamsState {
  return {
    day: null,
    calenderId: '',
    stationId: ''
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'currentParams' })
export class CurrentParamsStore extends Store<CurrentParamsState> {
  constructor() {
    super(createInitialState());
  }
}
