import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import {
    RoutesAllStationsStore,
    RoutesAllStationsState
} from './routes-all-stations.store';

@Injectable({ providedIn: 'root' })
export class RoutesAllStationsQuery extends QueryEntity<
    RoutesAllStationsState
> {
    constructor(protected store: RoutesAllStationsStore) {
        super(store);
    }
}
