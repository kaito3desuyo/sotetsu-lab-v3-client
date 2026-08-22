import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { TripClassBaseNamePipe } from 'src/app/shared/pipes/trip-class-base-name.pipe';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { OperationTableFormatStationNamePipe } from '../../pipes/operation-table-format-station-name.pipe';
import { OperationTableFormatTripClassNamePipe } from '../../pipes/operation-table-format-trip-class-name.pipe';

type TripRow = {
    tripOperationListId: string;
    tripDirection: number;
    tripBlockId: string;
    tripNumber: string;
    tripClassName: string;
    tripClassColor: string;
    isDeadhead: boolean;
    depotOut: boolean;
    depotIn: boolean;
    startStationName: string;
    startTime: string;
    endStationName: string;
    endTime: string;
};

/**
 * 運用表: 1 運用 = 1 縦タイムラインカード（B4・20-design-ui.md §5.3）。
 *
 * 情報要素（始発駅・発時刻/終着駅・着時刻/種別+列番リンク/入出庫/連続運行の接続）は
 * 旧テーブル表現（operation-table-table-presentational, 撤去済み）と同一。
 * 記号文字（┌└┐┘）は廃し、Material 風の縦タイムライン（ノード+連結線）に置換した。
 *
 * 時刻・駅の表示は常に「発 → 着」の順に正規化する
 * （startTime = 出発地点の記録・depotOut 対象、endTime = 到着地点の記録・depotIn 対象。
 * 旧実装が tripDirection で列の左右を入れ替えていたのは物理的な行路図の列位置を
 * 揃えるためであり、正規化後は tripDirection による分岐が不要になった）。
 */
@Component({
    selector: 'app-operation-table-card',
    templateUrl: './operation-table-card.component.html',
    styleUrl: './operation-table-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        PipesModule,
        DateFnsPipe,
        OperationTableFormatStationNamePipe,
        OperationTableFormatTripClassNamePipe,
        TripClassBaseNamePipe,
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

    readonly rows = computed<TripRow[]>(() => {
        const stationNameById = this.#stationNameById();
        const tripClassById = this.#tripClassById();

        return this.operationTrip().trips.map(
            (tripOperationList: TripOperationListDetailsDto) => {
                const trip = tripOperationList.trip;
                const tripClass = tripClassById.get(trip.tripClassId);
                const tripClassName = this.#formatTripClassName.transform(
                    tripClass?.tripClassName ?? '',
                );

                return {
                    tripOperationListId: tripOperationList.tripOperationListId,
                    tripDirection: trip.tripDirection,
                    tripBlockId: trip.tripBlockId,
                    tripNumber: trip.tripNumber,
                    tripClassName,
                    tripClassColor: tripClass?.tripClassColor ?? '#9e9e9e',
                    isDeadhead: tripClassName.includes('回送'),
                    depotOut: !!trip.depotOut,
                    depotIn: !!trip.depotIn,
                    startStationName: this.#formatStationName.transform(
                        stationNameById.get(
                            tripOperationList.startTime.stationId,
                        ),
                    ),
                    startTime: tripOperationList.startTime.departureTime,
                    endStationName: this.#formatStationName.transform(
                        stationNameById.get(
                            tripOperationList.endTime.stationId,
                        ),
                    ),
                    endTime: tripOperationList.endTime.arrivalTime,
                } satisfies TripRow;
            },
        );
    });

    readonly tripCount = computed(() => this.operationTrip().trips.length);
}
