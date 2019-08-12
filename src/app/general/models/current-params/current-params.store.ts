import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';

export interface CurrentParamsState {
  calenderId: string;
  stationId: string;
}

export function createInitialState(): CurrentParamsState {
  return {
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
