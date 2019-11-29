import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { IRoute } from 'src/app/general/interfaces/route';

export interface RoutesAllStationsState extends EntityState<IRoute> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'routesAllStations' })
export class RoutesAllStationsStore extends EntityStore<
    RoutesAllStationsState
> {
    constructor() {
        super();
    }
}
