import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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

/**
 * 運用表: ダイヤ select（常設・変更で calendar_id を差し替えて再取得）+
 * 運用群チップ絞り込み（B4）。モック 03 にあった「運用番号へジャンプ」select は
 * 2026-09-25 に外した（本番に無い機能で、運用群チップで十分に絞れるため）。
 *
 * チップ選択はカード単位の表示/非表示のみに使う（データ再取得しない）。
 * 永続化は OperationTableStore の elf-persist-state（key: 'OperationTableStore'）に
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
    ],
})
export class OperationTableFilterComponent {
    readonly operationTrips = input.required<OperationTripsDto[]>();
    readonly calendars = input.required<CalendarDetailsDto[]>();
    readonly calendarId = input<string | null>(null);

    readonly calendarChange = output<string>();

    readonly selectedGroupNames = toSignal(
        OperationTableStore.selectedGroupNames$,
        { initialValue: [] },
    );

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
        OperationTableStore.setSelectedGroupNames(values as string[]);
    }

    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;
        this.calendarChange.emit(calendarId);
    }
}
