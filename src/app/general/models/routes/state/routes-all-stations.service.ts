import { Injectable } from '@angular/core';
import { ID } from '@datorama/akita';
import { RoutesAllStationsStore } from './routes-all-stations.store';
import { tap } from 'rxjs/operators';
import { IRoute } from 'src/app/general/interfaces/route';
import { RouteApiService } from 'src/app/general/api/route-api.service';
import { BaseService } from 'src/app/general/classes/base-service';

@Injectable({ providedIn: 'root' })
export class RoutesAllStationsService extends BaseService {
    constructor(
        private routesAllStationsStore: RoutesAllStationsStore,
        private routeApi: RouteApiService
    ) {
        super();
        this.subscription = this.routeApi
            .getRoutesAllStations()
            .pipe(
                tap((entities) => {
                    this.routesAllStationsStore.set(entities);
                })
            )
            .subscribe();
    }

    add(routesAllStation: IRoute) {
        this.routesAllStationsStore.add(routesAllStation);
    }

    update(id: ID, routesAllStation: Partial<IRoute>) {
        this.routesAllStationsStore.update(id, routesAllStation);
    }

    remove(id: ID) {
        this.routesAllStationsStore.remove(id);
    }

    generateStationSelectList(routes: IRoute[]) {
        return routes.map((route: IRoute) => {
            return {
                routeName: route.routeName,
                stations: route.routeStationLists.map((routeToStation) => {
                    return {
                        label: routeToStation.station.stationName,
                        value: routeToStation.station.id,
                    };
                }),
            };
        });
    }
}
