import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { max } from 'lodash-es';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TimetableStationFindLastStopStationPipe } from '../../pipes/timetable-station-find-last-stop-station.pipe';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from '../../pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';
import { TimetableStationStore } from '../../stores/timetable-station.store';

@Component({
    selector: 'app-timetable-station-table',
    templateUrl: './timetable-station-table.component.html',
    styleUrl: './timetable-station-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        PipesModule,
        DateFnsPipe,
        OperationNumberTagComponent,
        TimetableStationFindLastStopStationPipe,
        TimetableStationFindOtherTripsInSameTripBlockPipe,
    ],
})
export class TimetableStationTableComponent {
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    /**
     * B7: 過去ダイヤ表示時は false になり、充当編成列（⑥）自体を描画しない。
     * 判定はルートコンポーネントの派生値（isTodaysCalendar）をそのまま受け取る。
     */
    readonly showCurrentFormation = input.required<boolean>();

    readonly calendar = toSignal(TimetableStationStore.calendar$);
    readonly stationName = toSignal(TimetableStationStore.stationName$);
    readonly tripDirection = toSignal(TimetableStationStore.tripDirection$);
    readonly tripClasses = toSignal(TimetableStationStore.tripClasses$, {
        initialValue: [],
    });
    readonly stations = toSignal(TimetableStationStore.stations$, {
        initialValue: [],
    });
    readonly timetableData = toSignal(TimetableStationStore.timetableData$, {
        initialValue: [],
    });
    readonly operations = toSignal(TimetableStationStore.operations$, {
        initialValue: [],
    });
    readonly operationSightingTimeCrossSections = toSignal(
        TimetableStationStore.operationSightingTimeCrossSections$,
        { initialValue: [] },
    );
    readonly stationId = toSignal(TimetableStationStore.stationId$);

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar && (calendar.sunday || calendar.saturday);
    });

    readonly maxColumnsCount = computed(() => {
        const data = this.timetableData();
        return max(data.map((o) => o.trips.length));
    });
}
