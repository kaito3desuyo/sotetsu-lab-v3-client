import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';

export interface ParamsState {
  calendarId: string;
}

export function createInitialState(): ParamsState {
  return {
    calendarId: ''
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'params' })
export class ParamsStore extends Store<ParamsState> {
  constructor() {
    super(createInitialState());
  }
}
