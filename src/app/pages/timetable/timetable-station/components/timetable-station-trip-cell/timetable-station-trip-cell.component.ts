import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripClassBaseNamePipe } from 'src/app/shared/pipes/trip-class-base-name.pipe';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { TimetableStationFindLastStopStationPipe } from '../../pipes/timetable-station-find-last-stop-station.pipe';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from '../../pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';

/**
 * 駅別時刻表: 1 列車分のセル（mockup-01 準拠のカード型）。
 *
 * 表示要素（既存 timetable-station-table のロジックを踏襲。UI 構造のみ作り直す）:
 * 左の列: 分（種別色。着時刻のみの列車は下線）/ 運用番号チップ（群色・行路図リンク）/
 *         充当編成番号（showCurrentFormation() が true の時のみ。前日目撃は「?」付き）
 * 右の列: 種別バッジ・列車番号・行先 / 同一 tripBlock 内でこの先に走る列車
 *         （種別変更・直通。種別・列番・発駅 → 着駅。前の区間は出さない）
 */
@Component({
    selector: 'app-timetable-station-trip-cell',
    templateUrl: './timetable-station-trip-cell.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatIconModule,
        RouterLink,
        PipesModule,
        DateFnsPipe,
        OperationNumberTagComponent,
        TimetableStationFindLastStopStationPipe,
        TimetableStationFindOtherTripsInSameTripBlockPipe,
        TripClassBaseNamePipe,
        TripClassChipComponent,
    ],
})
export class TimetableStationTripCellComponent {
    readonly trip = input.required<TripDetailsDto>();
    readonly calendarId = input.required<CalendarDetailsDto['calendarId']>();
    readonly stationId = input.required<StationDetailsDto['stationId']>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly operations = input.required<OperationDetailsDto[]>();
    /**
     * G1: operationNumber をキーにした Record（stores/timetable-station.store.ts 参照）。
     */
    readonly operationSightingTimeCrossSections =
        input.required<Record<string, OperationSightingTimeCrossSectionDto>>();

    /**
     * B7: 過去ダイヤ表示時は false になり、充当編成（6）自体を描画しない。
     */
    readonly showCurrentFormation = input.required<boolean>();
}
