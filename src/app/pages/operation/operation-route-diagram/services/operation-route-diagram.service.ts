import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { sortBy } from 'lodash-es';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from '../states/operation-route-diagram.state';

@Injectable()
export class OperationRouteDiagramService {
    constructor(
        private readonly operationService: OperationService,
        private readonly stationService: StationService,
        private readonly operationRouteDiagramStateStore: OperationRouteDiagramStateStore,
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery
    ) {}

    // v2

    fetchOperationTrips(): Observable<void> {
        const operationId = this.operationRouteDiagramStateQuery.operationId;

        if (!operationId) {
            return of(undefined);
        }

        const qb = new RequestQueryBuilder().setJoin([{ field: 'calendar' }]);

        return this.operationService.findOneWithTrips(operationId, qb).pipe(
            tap((operationTrips) => {
                this.operationRouteDiagramStateStore.setOperationTrips(
                    operationTrips
                );
            }),
            map(() => undefined)
        );
    }

    fetchStationsV2(): Observable<void> {
        const targetStation = [
            '厚木',
            '海老名',
            'かしわ台',
            '相模大塚',
            '大和',
            '瀬谷',
            '湘南台',
            'いずみ野',
            '二俣川',
            '西谷',
            '星川',
            '西横浜',
            '横浜',
            '羽沢横浜国大',
            '大崎',
            '新宿',
            '池袋',
            '板橋',
            '赤羽',
            '武蔵浦和',
            '大宮',
            '指扇',
            '川越',
        ];

        const qb = new RequestQueryBuilder().setFilter([
            {
                field: 'stationName',
                operator: CondOperator.IN,
                value: targetStation,
            },
        ]);

        return this.stationService.findMany(qb).pipe(
            tap((stations: StationDetailsDto[]) => {
                this.operationRouteDiagramStateStore.setStations(
                    sortBy(stations, [
                        (station) =>
                            targetStation.findIndex(
                                (target) => station.stationName === target
                            ),
                    ])
                );
            }),
            map(() => undefined)
        );
    }
}
