import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import moment from 'moment';

export interface CurrentParamsState {
    today: string;
    day: 'weekday' | 'holiday';
    calendar: {
        id: string;
        lastUpdatedAt: string;
    };
    stationId: string;
}

export function createInitialState(): CurrentParamsState {
    const localStorageValue = JSON.parse(localStorage.getItem('currentParams'));

    return {
        today: moment()
            .subtract(moment().hour() < 4 ? 1 : 0)
            .format('YYYY-MM-DD'),
        day: null,
        calendar: {
            id: '',
            lastUpdatedAt: ''
        },
        stationId: '',
        ...(localStorageValue || {})
    };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'currentParams' })
export class CurrentParamsStore extends Store<CurrentParamsState> {
    constructor() {
        super(createInitialState());
    }
}
