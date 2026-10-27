import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationTableStore } from '../../stores/operation-table.store';
import { operationGroupOptions } from 'src/app/shared/operation-group.util';
import { SkeletonChipsComponent } from 'src/app/shared/skeleton/skeleton-chips.component';
import { TodayCalendarButtonComponent } from 'src/app/shared/today-calendar-button/today-calendar-button.component';

/**
 * 運用表: ダイヤ select（常設・変更で calendar_id を差し替えて再取得）+
 * 運用群チップ絞り込み（B4）。モック 03 にあった「運用番号へジャンプ」select は
 * 2026-09-25 に外した（本番に無い機能で、運用群チップで十分に絞れるため）。
 *
 * チップ選択はカード単位の表示/非表示のみに使う（データ再取得しない）。
 * 永続化は OperationTableStore の withSettingsStorage（key: 'OperationTableStore'）に
 * 委譲する。リアルタイム運用情報ページ（OperationRealTimeStore）とは独立したキー。
 */
@Component({
    selector: 'app-operation-table-filter',
    templateUrl: './operation-table-filter.component.html',
    styleUrl: './operation-table-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatSelectModule,
        DateFnsPipe,
        FilterChipsComponent,
        SkeletonChipsComponent,
        TodayCalendarButtonComponent,
    ],
})
export class OperationTableFilterComponent {
    readonly #store = inject(OperationTableStore);

    readonly operationTrips = input.required<OperationTripsDto[]>();
    readonly calendars = input.required<CalendarDetailsDto[]>();
    readonly calendarId = input<string | null>(null);

    readonly calendarChange = output<string>();

    readonly selectedGroupNames = this.#store.normalizedSelectedGroupNames;

    readonly hasFetchedOperationTrips = this.#store.hasFetchedOperationTrips;
    /** 運用群のチップの骨組みの幅（リアルタイムの運用群の行と同じ） */
    readonly groupSkeletonWidths = [
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-14',
    ];

    /**
     * 運用群チップはリアルタイム運用情報と同じもの（ユーザー指示 2026-09-25）。
     * 群は実在する運用番号から導き、見本色を付け、休を末尾に足す。
     */
    readonly groupOptions = computed<FilterChipOption[]>(() =>
        operationGroupOptions(
            this.operationTrips().map(
                (operationTrip) => operationTrip.operation.operationNumber,
            ),
        ),
    );

    onGroupChange(values: FilterChipValue[]): void {
        this.#store.setSelectedGroupNames(values as string[]);
    }

    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;
        this.calendarChange.emit(calendarId);
    }
}
