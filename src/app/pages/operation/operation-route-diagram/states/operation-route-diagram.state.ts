import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

type OperationRouteDiagramState = {
    operationId: string;
    operationTrips: OperationTripsDto;
    stations: StationDetailsDto[];
};

@Injectable()
export class OperationRouteDiagramStateStore extends Store<OperationRouteDiagramState> {
    constructor() {
        super(
            {
                operationId: null,
                operationTrips: null,
                stations: [],
            },
            { name: `OperationRouteDiagram-${guid()}` }
        );
    }

    setOperationId(operationId: string): void {
        this.update({
            operationId,
        });
    }

    setOperationTrips(operationTrips: OperationTripsDto): void {
        this.update({
            operationTrips,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }
}

@Injectable()
export class OperationRouteDiagramStateQuery extends Query<OperationRouteDiagramState> {
    readonly calendar$ = this.select(
        (state) => state.operationTrips?.operation.calendar
    );
    readonly operation$ = this.select(
        (state) => state.operationTrips?.operation
    );
    readonly stations$ = this.select((state) =>
        this._filterTargetStations(state.stations)
    );
    readonly tripOperationLists$ = this.select(
        (state) => state.operationTrips?.trips
    );

    get calendarId(): string {
        return this.getValue().operationTrips?.operation.calendarId;
    }
    get operationId(): string {
        return this.getValue().operationId;
    }

    constructor(protected store: OperationRouteDiagramStateStore) {
        super(store);
    }

    private _filterTargetStations(
        stations: StationDetailsDto[]
    ): StationDetailsDto[] {
        return targetStations.map(({ routeName, stationName }) => {
            const targetSet = new Set(routeName);

            return stations.find((s) => {
                const dataSet = new Set(
                    s.routeStationLists.map((rsl) => rsl.route.routeName)
                );

                const differenceSet = new Set(
                    [...dataSet].filter((x) => !targetSet.has(x))
                );

                return (
                    differenceSet.size === 0 && s.stationName === stationName
                );
            });
        });
    }
}

const targetStations = [
    { routeName: ['厚木線'], stationName: '厚木' },
    { routeName: ['本線'], stationName: '海老名' },
    { routeName: ['本線', '厚木線'], stationName: 'かしわ台' },
    { routeName: ['本線'], stationName: '相模大塚' },
    { routeName: ['本線'], stationName: '大和' },
    { routeName: ['本線'], stationName: '瀬谷' },
    { routeName: ['いずみ野線'], stationName: '湘南台' },
    { routeName: ['いずみ野線'], stationName: 'いずみ野' },
    { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
    { routeName: ['本線', '新横浜線'], stationName: '西谷' },
    { routeName: ['本線'], stationName: '星川' },
    { routeName: ['本線'], stationName: '西横浜' },
    { routeName: ['本線'], stationName: '横浜' },
    {
        routeName: ['新横浜線', '相鉄・JR直通線'],
        stationName: '羽沢横浜国大',
    },
    {
        routeName: ['相鉄・JR直通線', '埼京線', 'りんかい線'],
        stationName: '大崎',
    },
    {
        routeName: ['埼京線'],
        stationName: '新宿',
    },
    {
        routeName: ['埼京線'],
        stationName: '池袋',
    },
    {
        routeName: ['埼京線'],
        stationName: '板橋',
    },
    {
        routeName: ['埼京線'],
        stationName: '赤羽',
    },
    {
        routeName: ['埼京線'],
        stationName: '武蔵浦和',
    },
    {
        routeName: ['埼京線', '川越線'],
        stationName: '大宮',
    },
    {
        routeName: ['川越線'],
        stationName: '指扇',
    },
    {
        routeName: ['川越線'],
        stationName: '南古谷',
    },
    {
        routeName: ['川越線'],
        stationName: '川越',
    },
];
