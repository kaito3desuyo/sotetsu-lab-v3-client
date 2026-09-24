import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { agenciesInThroughServiceOrder } from 'src/app/shared/agencies-in-through-service-order.util';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import {
    deriveGroupName,
    deriveGroupNames,
    RETIRED_GROUP_NAME,
    RETIRED_OPERATION_NUMBER,
} from '../../utils/operation-real-time-filter.util';

/**
 * リアルタイム運用情報: 会社（B2）・運用群（B3）絞り込みチップ行。
 *
 * mockup-02 / 98 §G2 準拠: 見出しは「絞り込み（表示のみ・取得と購読は全件のまま）」
 * の 1 行に統合し、会社チップ（選択=紺塗り✓）と運用群チップ（選択=オレンジ塗り✓）を
 * 横スクロール 1 行に混在させる。
 *
 * 表示フィルタ（非破壊）: 選択状態は OperationRealTimeStore に書き込むのみで
 * データ取得・WebSocket 購読には一切影響しない。永続化は同ストアの
 * elf-persist-state（localforage, key: 'OperationRealTimeStore'）に委譲する。
 */
@Component({
    selector: 'app-operation-real-time-filter',
    templateUrl: './operation-real-time-filter.component.html',
    styleUrl: './operation-real-time-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent],
})
export class OperationRealTimeFilterComponent {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #operationNumberColorPipe = new NewOperationNumberColorPipe();

    readonly agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    readonly routes = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    /**
     * 群チップの出所は API の群定義ではなく**実在する運用番号**。
     * API `/v3/operations/groups` は本来 15 群あるべきところ 5 群しか返しておらず、
     * 実データ 93 運用番号のうち 60 件がどのチップでも絞り込めなかった
     * （2026-08-22 実測）。群名は運用番号から規則で導出する。
     */
    readonly operations = toSignal(OperationRealTimeStore.operations$, {
        initialValue: [],
    });
    readonly selectedAgencyIds = toSignal(
        OperationRealTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );
    readonly selectedGroupNames = toSignal(
        OperationRealTimeStore.selectedGroupNames$,
        { initialValue: [] },
    );

    /** 会社は相鉄と直通を始めた順に並べる（agenciesInThroughServiceOrder）。 */
    readonly agencyOptions = computed<FilterChipOption[]>(() =>
        agenciesInThroughServiceOrder(this.agencies(), this.routes()).map(
            (agency) => ({
                value: agency.agencyId,
                label: agency.agencyName,
            }),
        ),
    );

    /**
     * 実在する運用番号 → 群名。休（運用番号 100）は API にも運用一覧にも
     * 現れない場合があるため、従来どおり常に末尾へ足す。
     */
    readonly groupOptions = computed<FilterChipOption[]>(() => {
        const operationNumbers = this.operations().map(
            (operation) => operation.operationNumber,
        );
        const groupNames = deriveGroupNames([
            ...operationNumbers,
            RETIRED_OPERATION_NUMBER,
        ]);

        return groupNames.map((groupName) => ({
            value: groupName,
            label: groupName,
            // 見本色は群の代表運用番号から引く。休は専用色を持つ。
            color: this.#operationNumberColorPipe.transform(
                groupName === RETIRED_GROUP_NAME
                    ? RETIRED_OPERATION_NUMBER
                    : (operationNumbers.find(
                          (operationNumber) =>
                              deriveGroupName(operationNumber) === groupName,
                      ) ?? ''),
            ),
        }));
    });

    onAgencyChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedAgencyIds(values as string[]);
    }

    onGroupChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedGroupNames(values as string[]);
    }
}
