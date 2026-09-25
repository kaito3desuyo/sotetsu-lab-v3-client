import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { OperationTableFormatStationNamePipe } from '../../pipes/operation-table-format-station-name.pipe';
import { OperationTableFormatTripClassNamePipe } from '../../pipes/operation-table-format-trip-class-name.pipe';

/** 行の端（左右）に引く線。前の行・次の行とつながるかと、入出庫の印。 */
export type RowEdge = {
    up: boolean;
    down: boolean;
    depot: 'out' | 'in' | null;
    /** 端の線の SVG path（viewBox 0 0 16 16）。線が無ければ空文字。 */
    path: string;
};

type EdgeLinks = Omit<RowEdge, 'path'>;

/**
 * 端の線を path にする。縦線は端の列の中央（x=8）、行の中央（y=8）から
 * 内側（左端なら右、右端なら左）へ横線を出して駅名につなぐ。
 */
export const edgePath = (
    { up, down }: EdgeLinks,
    side: 'left' | 'right',
): string => {
    if (!up && !down) return '';
    const inner = side === 'left' ? 16 : 0;
    const vertical = `M8 ${up ? 0 : 8} V${down ? 16 : 8}`;
    return `${vertical} M8 8 H${inner}`;
};

const withPath = (edge: EdgeLinks, side: 'left' | 'right'): RowEdge => ({
    ...edge,
    path: edgePath(edge, side),
});

/** 行の端に置く駅と時刻。 */
export type RowEnd = {
    stationName: string;
    /** 駅名を 3 文字幅に収める横の縮尺（4 文字以上の駅名だけ 1 未満）。 */
    stationScale: number;
    time: string;
};

export type TripRow = {
    kind: 'trip';
    key: string;
    tripDirection: number;
    tripBlockId: string;
    tripNumber: string;
    tripClassName: string;
    tripClassColor: string;
    isDeadhead: boolean;
    depotOut: boolean;
    depotIn: boolean;
    left: RowEnd;
    right: RowEnd;
    leftEdge: RowEdge;
    rightEdge: RowEdge;
};

/** 同じ向きへ続けて走るときに挟むつなぎの行（本番の「━━━」の行）。 */
export type LinkRow = {
    kind: 'link';
    key: string;
    leftEdge: RowEdge;
    rightEdge: RowEdge;
};

export type CardRow = TripRow | LinkRow;

const STATION_WIDTH = 3;

/**
 * 運用表: 1 運用 = 1 カードの折返し表（本番 master の表の構造を正とする。2026-09-25）。
 *
 * 西側（海老名・湘南台・西谷）を左、横浜を右に置き、上り（INBOUND）は左 → 右、
 * 下り（OUTBOUND）は右 → 左へ流す。地図と同じ向きで行ったり来たりが読める。
 * 行の端の線は、同じ駅で次の列車へ続く（折り返す）ことを表す。
 * 同じ向きへ続けて走るときは、つなぎの行を挟んで Z 字につなぐ。
 * 出庫は ◯、入庫は △ を、線の代わりに端へ置く。
 *
 * 線は本番の罫線文字（┏┗┓┛━）ではなく SVG で描く（字・種別チップ・リンクは HTML）。
 * 列車の行は、発時刻から着時刻へ伸びる種別色の矢印に種別・列番を載せ、余った幅は矢印線が吸う。
 */
@Component({
    selector: 'app-operation-table-card',
    templateUrl: './operation-table-card.component.html',
    styleUrl: './operation-table-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgTemplateOutlet,
        RouterLink,
        PipesModule,
        DateFnsPipe,
        TripClassChipComponent,
    ],
})
export class OperationTableCardComponent {
    readonly operationTrip = input.required<OperationTripsDto>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly calendarId = input.required<string | null>();
    /** 運用番号が属する群名（実データそのまま）。モック 03: ヘッダの運用番号バッジ。未解決なら非表示。 */
    readonly groupName = input<string>();

    readonly #formatStationName = new OperationTableFormatStationNamePipe();
    readonly #formatTripClassName = new OperationTableFormatTripClassNamePipe();

    readonly #stationNameById = computed(() => {
        const map = new Map<string, string>();
        for (const station of this.stations()) {
            map.set(station.stationId, station.stationName);
        }
        return map;
    });

    readonly #tripClassById = computed(() => {
        const map = new Map<string, TripClassDetailsDto>();
        for (const tripClass of this.tripClasses()) {
            map.set(tripClass.tripClassId, tripClass);
        }
        return map;
    });

    readonly rows = computed<CardRow[]>(() => {
        const stationNameById = this.#stationNameById();
        const tripClassById = this.#tripClassById();
        const trips = this.operationTrip().trips;

        const end = (stationId: string, time: string): RowEnd => {
            const stationName = this.#formatStationName.transform(
                stationNameById.get(stationId),
            );
            const length = [...stationName].length;
            return {
                stationName,
                stationScale:
                    length > STATION_WIDTH ? STATION_WIDTH / length : 1,
                time,
            };
        };

        // 前の列車の終点から次の列車が出る（入庫・出庫で切れていない）
        const connects = (index: number): boolean => {
            const current = trips[index]?.trip;
            const next = trips[index + 1]?.trip;
            return !!current && !!next && !current.depotIn && !next.depotOut;
        };

        const rows: CardRow[] = [];
        trips.forEach((tripOperationList, index) => {
            const trip = tripOperationList.trip;
            const tripClass = tripClassById.get(trip.tripClassId);
            const tripClassName = this.#formatTripClassName.transform(
                tripClass?.tripClassName ?? '',
            );
            const isInbound = trip.tripDirection === ETripDirection.INBOUND;

            const start = end(
                tripOperationList.startTime.stationId,
                tripOperationList.startTime.departureTime,
            );
            const finish = end(
                tripOperationList.endTime.stationId,
                tripOperationList.endTime.arrivalTime,
            );
            // 始点側の端は前の行と、終点側の端は次の行とつながる
            const startEdge: EdgeLinks = {
                up: connects(index - 1),
                down: false,
                depot: trip.depotOut ? 'out' : null,
            };
            const finishEdge: EdgeLinks = {
                up: false,
                down: connects(index),
                depot: trip.depotIn ? 'in' : null,
            };

            rows.push({
                kind: 'trip',
                key: tripOperationList.tripOperationListId,
                tripDirection: trip.tripDirection,
                tripBlockId: trip.tripBlockId,
                tripNumber: trip.tripNumber,
                tripClassName,
                tripClassColor: tripClass?.tripClassColor ?? '#9e9e9e',
                isDeadhead: tripClassName.includes('回送'),
                depotOut: !!trip.depotOut,
                depotIn: !!trip.depotIn,
                left: isInbound ? start : finish,
                right: isInbound ? finish : start,
                leftEdge: withPath(isInbound ? startEdge : finishEdge, 'left'),
                rightEdge: withPath(
                    isInbound ? finishEdge : startEdge,
                    'right',
                ),
            });

            const next = trips[index + 1]?.trip;
            if (
                connects(index) &&
                next &&
                next.tripDirection === trip.tripDirection
            ) {
                // 終点側から降りてきた線を、次の列車の始点側へ渡す
                const fromFinish: EdgeLinks = {
                    up: true,
                    down: false,
                    depot: null,
                };
                const toStart: EdgeLinks = {
                    up: false,
                    down: true,
                    depot: null,
                };
                rows.push({
                    kind: 'link',
                    key: `${tripOperationList.tripOperationListId}-link`,
                    leftEdge: withPath(
                        isInbound ? toStart : fromFinish,
                        'left',
                    ),
                    rightEdge: withPath(
                        isInbound ? fromFinish : toStart,
                        'right',
                    ),
                });
            }
        });
        return rows;
    });

    readonly tripCount = computed(() => this.operationTrip().trips.length);
}
