import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrentParamsStore, CurrentParamsState } from './current-params.store';

@Injectable({ providedIn: 'root' })
export class CurrentParamsService {
  constructor(private currentParamsStore: CurrentParamsStore) {}

  update(value: Partial<CurrentParamsState>) {
    this.currentParamsStore.update(value);
  }
}
