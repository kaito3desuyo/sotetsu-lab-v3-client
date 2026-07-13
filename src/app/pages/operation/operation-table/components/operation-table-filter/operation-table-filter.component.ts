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
import { withRetiredGroup } from '../../utils/operation-table-filter.util';

/**
 * 運用表: ダイヤ select（常設・変更で calendar_id を差し替えて再取得）+
 * 「運用番号へジャンプ」select + 運用群チップ絞り込み（B4）。モック 03 準拠。
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

    readonly jump = output<string>();
    readonly calendarChange = output<string>();

    readonly operationGroups = toSignal(OperationTableStore.operationGroups$, {
        initialValue: [],
    });
    readonly selectedGroupNames = toSignal(
        OperationTableStore.selectedGroupNames$,
        { initialValue: [] },
    );

    // モック 03: 群チップはオレンジの ✓ チップ（無印/G/K…）。
    // 旧パステル群色は付けず、選択状態の配色は scss（accent #ee7b35）で統一する。
    readonly groupOptions = computed<FilterChipOption[]>(() =>
        withRetiredGroup(this.operationGroups()).map((group) => ({
            value: group.groupName,
            label: group.groupName,
        })),
    );

    onGroupChange(values: FilterChipValue[]): void {
        OperationTableStore.setSelectedGroupNames(values as string[]);
    }

    onJumpChange(operationNumber: string): void {
        if (!operationNumber) return;
        this.jump.emit(operationNumber);
    }

    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;
        this.calendarChange.emit(calendarId);
    }
}
