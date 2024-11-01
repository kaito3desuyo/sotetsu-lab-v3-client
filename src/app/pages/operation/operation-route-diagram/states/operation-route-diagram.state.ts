import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

type State = {
    operationId: string;
    operationTrips: OperationTripsDto;
    stations: StationDetailsDto[];
};

@Injectable()
export class OperationRouteDiagramStateStore {
    readonly state = createElfStore<State>({
        name: 'OperationRouteDiagram',
        initialValue: {
            operationId: null,
            operationTrips: null,
            stations: [],
        },
    });

    setOperationId(operationId: string): void {
        this.state.update(
            setProps({
                operationId,
            }),
        );
    }

    setOperationTrips(operationTrips: OperationTripsDto): void {
        this.state.update(
            setProps({
                operationTrips,
            }),
        );
    }

    setStations(stations: StationDetailsDto[]): void {
        this.state.update(
            setProps({
                stations,
            }),
        );
    }
}

@Injectable()
export class OperationRouteDiagramStateQuery {
    readonly #store = inject(OperationRouteDiagramStateStore);

    readonly operationId$ = this.#store.state.pipe(
        select((state) => state.operationId),
    );
    readonly calendar$ = this.#store.state.pipe(
        select((state) => state.operationTrips?.operation.calendar),
    );
    readonly operation$ = this.#store.state.pipe(
        select((state) => state.operationTrips?.operation),
    );
    readonly stations$ = this.#store.state.pipe(
        select((state) => state.stations),
        map((stations) => this.#filterTargetStations(stations)),
    );
    readonly tripOperationLists$ = this.#store.state.pipe(
        select((state) => state.operationTrips?.trips),
    );

    get calendarId(): string {
        const { operationTrips } = this.#store.state.getValue();
        return operationTrips?.operation.calendarId;
    }

    get operationId(): string {
        const { operationId } = this.#store.state.getValue();
        return operationId;
    }

    #filterTargetStations(stations: StationDetailsDto[]): StationDetailsDto[] {
        return targetStations
            .map(({ routeName, stationName }) => {
                const targetSet = new Set(routeName);

                return stations.find((s) => {
                    const dataSet = new Set(
                        s.routeStationLists.map((rsl) => rsl.route.routeName),
                    );

                    const differenceSet = new Set(
                        [...dataSet].filter((x) => !targetSet.has(x)),
                    );

                    return (
                        differenceSet.size === 0 &&
                        s.stationName === stationName
                    );
                });
            })
            .filter((o) => !!o);
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
    { routeName: ['本線', '相鉄新横浜線'], stationName: '西谷' },
    { routeName: ['本線'], stationName: '星川' },
    { routeName: ['本線'], stationName: '西横浜' },
    { routeName: ['本線'], stationName: '横浜' },
    { routeName: ['みなとみらい線'], stationName: '元町・中華街' },
    { routeName: ['みなとみらい線', '東横線'], stationName: '横浜' },
    { routeName: ['東横線'], stationName: '菊名' },
    {
        routeName: ['新横浜線', '相鉄・JR直通線'],
        stationName: '羽沢横浜国大',
    },
    {
        routeName: ['相鉄新横浜線', '相鉄・JR直通線'],
        stationName: '羽沢横浜国大',
    },
    {
        routeName: ['新横浜線'],
        stationName: '新横浜',
    },
    {
        routeName: ['新横浜線', '東急新横浜線'],
        stationName: '新横浜',
    },
    {
        routeName: ['相鉄新横浜線', '東急新横浜線'],
        stationName: '新横浜',
    },
    {
        routeName: ['東急新横浜線', '東横線', '目黒線'],
        stationName: '日吉',
    },
    {
        routeName: ['東横線', '目黒線'],
        stationName: '元住吉',
    },
    {
        routeName: ['東横線', '目黒線'],
        stationName: '武蔵小杉',
    },
    {
        routeName: ['東横線', '副都心線'],
        stationName: '渋谷',
    },
    {
        routeName: ['副都心線'],
        stationName: '新宿三丁目',
    },
    {
        routeName: ['副都心線'],
        stationName: '池袋',
    },
    {
        routeName: ['副都心線', '有楽町線'],
        stationName: '千川',
    },
    {
        routeName: ['副都心線', '有楽町線', '西武有楽町線'],
        stationName: '小竹向原',
    },
    {
        routeName: ['池袋線'],
        stationName: '池袋',
    },
    {
        routeName: ['池袋線', '西武有楽町線'],
        stationName: '練馬',
    },
    {
        routeName: ['池袋線'],
        stationName: '保谷',
    },
    {
        routeName: ['池袋線'],
        stationName: '飯能',
    },
    {
        routeName: ['池袋線'],
        stationName: '武蔵丘（信）',
    },
    {
        routeName: ['池袋線', '秩父線'],
        stationName: '吾野',
    },
    {
        routeName: ['秩父線'],
        stationName: '西武秩父',
    },
    {
        routeName: ['東上本線'],
        stationName: '池袋',
    },
    {
        routeName: ['副都心線', '有楽町線', '東上本線'],
        stationName: '和光市',
    },
    {
        routeName: ['東上本線'],
        stationName: '志木',
    },
    {
        routeName: ['東上本線'],
        stationName: '川越市',
    },
    {
        routeName: ['東上本線'],
        stationName: '森林公園',
    },
    {
        routeName: ['東上本線'],
        stationName: '小川町',
    },
    {
        routeName: ['目黒線'],
        stationName: '奥沢',
    },
    {
        routeName: ['目黒線'],
        stationName: '大岡山',
    },
    {
        routeName: ['目黒線'],
        stationName: '武蔵小山',
    },
    {
        routeName: ['目黒線', '南北線', '三田線'],
        stationName: '目黒',
    },
    {
        routeName: ['南北線', '三田線'],
        stationName: '白金高輪',
    },
    {
        routeName: ['南北線'],
        stationName: '麻布十番',
    },
    {
        routeName: ['南北線'],
        stationName: '市ケ谷',
    },
    {
        routeName: ['南北線'],
        stationName: '駒込',
    },
    {
        routeName: ['南北線', '埼玉高速鉄道線'],
        stationName: '赤羽岩淵',
    },
    {
        routeName: ['埼玉高速鉄道線'],
        stationName: '鳩ヶ谷',
    },
    {
        routeName: ['埼玉高速鉄道線'],
        stationName: '浦和美園',
    },
    {
        routeName: ['三田線'],
        stationName: '高島平',
    },
    {
        routeName: ['三田線'],
        stationName: '西高島平',
    },
    {
        routeName: ['りんかい線'],
        stationName: '新木場',
    },
    {
        routeName: ['りんかい線'],
        stationName: '東京テレポート',
    },
    {
        routeName: ['相鉄・JR直通線', '埼京線'],
        stationName: '大崎',
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
