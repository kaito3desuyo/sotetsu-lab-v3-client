import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { agenciesInThroughServiceOrder } from 'src/app/shared/agencies-in-through-service-order.util';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { operationGroupOptions } from 'src/app/shared/operation-group.util';
import { SkeletonChipsComponent } from 'src/app/shared/skeleton/skeleton-chips.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';

/**
 * リアルタイム運用情報: 会社（B2）・運用群（B3）絞り込みチップ行。
 * 見出しは「絞り込み」だけ（括弧の注記は付けない。ユーザー指示 2026-10-05）。mockup-02 / 98 §G2 では 1 行に統合し、
 * mockup-02 / 98 §G2 準拠: 見出しは「絞り込み」
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent, SkeletonChipsComponent],
})
export class OperationRealTimeFilterComponent {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

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

    readonly formations = toSignal(OperationRealTimeStore.formations$, {
        initialValue: [],
    });
    readonly hasFetchedOperations = toSignal(
        OperationRealTimeStore.hasFetchedOperations$,
        { initialValue: false },
    );
    readonly hasFetchedFormations = toSignal(
        OperationRealTimeStore.hasFetchedFormations$,
        { initialValue: false },
    );

    /** 取る前の骨組みのチップの幅（会社名・運用群名の長さをなぞる） */
    readonly agencySkeletonWidths = ['tw-w-14', 'tw-w-24', 'tw-w-14'];
    readonly groupSkeletonWidths = [
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-14',
    ];

    /**
     * 会社は相鉄と直通を始めた順に並べる（agenciesInThroughServiceOrder）。
     * 出すのは編成を持つ会社だけ（ユーザー指示 2026-10-12）。選んだまま保存されている会社は、
     * 外せなくならないよう残す。
     */
    readonly agencyOptions = computed<FilterChipOption[]>(() => {
        const visibleAgencyIds = new Set([
            ...this.formations().map((formation) => formation.agencyId),
            ...this.selectedAgencyIds(),
        ]);
        return agenciesInThroughServiceOrder(
            this.agencies().filter((agency) =>
                visibleAgencyIds.has(agency.agencyId),
            ),
            this.routes(),
        ).map((agency) => ({
            value: agency.agencyId,
            label: agency.agencyName,
        }));
    });

    /**
     * 実在する運用番号 → 群名。休（運用番号 100）は API にも運用一覧にも
     * 現れない場合があるため、従来どおり常に末尾へ足す。
     */
    readonly groupOptions = computed<FilterChipOption[]>(() =>
        operationGroupOptions(
            this.operations().map((operation) => operation.operationNumber),
        ),
    );

    onAgencyChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedAgencyIds(values as string[]);
    }

    onGroupChange(values: FilterChipValue[]): void {
        OperationRealTimeStore.setSelectedGroupNames(values as string[]);
    }
}
