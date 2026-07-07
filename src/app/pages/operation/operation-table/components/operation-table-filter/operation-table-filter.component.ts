import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { OperationNumberColorPipe } from 'src/app/core/pipes/operation-number-color.pipe';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationTableStore } from '../../stores/operation-table.store';
import { withRetiredGroup } from '../../utils/operation-table-filter.util';

/**
 * 運用表: 運用群チップ絞り込み（B4）+「運用番号へジャンプ」select。
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
    imports: [MatFormFieldModule, MatSelectModule, FilterChipsComponent],
})
export class OperationTableFilterComponent {
    readonly operationTrips = input.required<OperationTripsDto[]>();

    readonly jump = output<string>();

    readonly #operationNumberColorPipe = new OperationNumberColorPipe();

    readonly operationGroups = toSignal(OperationTableStore.operationGroups$, {
        initialValue: [],
    });
    readonly selectedGroupNames = toSignal(
        OperationTableStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly groupOptions = computed<FilterChipOption[]>(() =>
        withRetiredGroup(this.operationGroups()).map((group) => ({
            value: group.groupName,
            label: group.groupName,
            color: this.#operationNumberColorPipe.transform(
                group.operationNumbers[0],
            ),
        })),
    );

    onGroupChange(values: FilterChipValue[]): void {
        OperationTableStore.setSelectedGroupNames(values as string[]);
    }

    onJumpChange(operationNumber: string): void {
        if (!operationNumber) return;
        this.jump.emit(operationNumber);
    }
}
