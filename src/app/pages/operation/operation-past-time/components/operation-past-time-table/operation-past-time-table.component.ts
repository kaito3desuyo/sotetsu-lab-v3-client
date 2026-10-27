import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { format, subDays, subHours } from 'date-fns';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { FindByIdPipe } from 'src/app/core/pipes/find-by-id.pipe';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { UserState } from 'src/app/global-states/user.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { OperationSightingInvalidationDialogService } from 'src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.service';
import { OperationSightingRestorationDialogService } from 'src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.service';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';
import { matchesAgencyFilter } from '../../utils/operation-past-time-filter.util';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

const INVALIDATED_BORDER_COLOR = 'rgb(183, 28, 28)';

@Component({
    selector: 'app-operation-past-time-table',
    templateUrl: './operation-past-time-table.component.html',
    styleUrl: './operation-past-time-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        OperationNumberTagComponent,
        DateFnsPipe,
        FindByIdPipe,
        EmptyStateComponent,
        SkeletonBarComponent,
    ],
})
export class OperationPastTimeTableComponent {
    readonly #store = inject(OperationPastTimeStore);
    readonly #router = inject(Router);
    readonly #userState = inject(UserState);
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationSightingInvalidationDialogService = inject(
        OperationSightingInvalidationDialogService,
    );
    readonly #operationSightingRestorationDialogService = inject(
        OperationSightingRestorationDialogService,
    );

    readonly invalidatedBorderColor = INVALIDATED_BORDER_COLOR;

    readonly userRole = this.#userState.role;
    readonly referenceDate = this.#store.referenceDate;
    readonly days = this.#store.days;
    readonly calendars = this.#store.calendars;
    readonly operations = this.#store.operations;
    readonly formations = this.#store.formations;
    readonly selectedAgencyIds = this.#store.selectedAgencyIds;
    // state の operationSightings（取得した一覧）ではなく、編成と運行日で分けた派生を読む
    readonly operationSightings = this.#store.operationSightingsGroupedByDate;
    readonly hasFetchedPastTime = this.#store.hasFetchedPastTime;
    /** 骨組みの行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonRows = Array.from({ length: 24 }, (_, i) => i);
    /** 骨組みの日付の列の数（7 日分） */
    readonly skeletonDays = Array.from({ length: 7 }, (_, i) => i);

    readonly tableDisplayed = computed(() => {
        const referenceDate = this.referenceDate();
        const days = this.days();
        return !!referenceDate && !!days;
    });
    readonly contextMenuDisabled = computed(() => {
        const role = this.userRole();
        return role !== 'manager' && role !== 'editor';
    });
    readonly visibleFormations = computed(() => {
        const selectedAgencyIds = this.selectedAgencyIds();
        return this.formations().filter((formation: FormationDetailsDto) =>
            matchesAgencyFilter(formation.agencyId, selectedAgencyIds),
        );
    });
    /**
     * G12: 検索条件（基準日+日数）は揃っているが、絞り込み等の結果 0 件になっているか。
     * 表示フィルタ（会社チップ）が全編成を除外した場合と、そもそも対象期間に
     * 編成データが無い場合の両方をカバーする。
     */
    readonly hasResults = computed(
        () =>
            this.calendars().length > 0 && this.visibleFormations().length > 0,
    );

    generateOnClickInvalidateCallback(
        sighting: OperationSightingDetailsDto,
    ): () => void {
        return () => {
            const dialogRef =
                this.#operationSightingInvalidationDialogService.open({
                    operationSightingId: sighting.operationSightingId,
                });

            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    await tryCatchAsync(
                        this.#operationPastTimeService.fetchOperationSightingsV3(),
                    );
                }
            });
        };
    }

    generateOnClickRestoreCallback(
        sighting: OperationSightingDetailsDto,
    ): () => void {
        return () => {
            const dialogRef =
                this.#operationSightingRestorationDialogService.open({
                    operationSightingId: sighting.operationSightingId,
                });

            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    await tryCatchAsync(
                        this.#operationPastTimeService.fetchOperationSightingsV3(),
                    );
                }
            });
        };
    }

    /** G12: 0件空状態の次アクション。会社チップの絞り込み（表示フィルタ）を解除する。 */
    onResetAgencyFilter(): void {
        this.#store.setSelectedAgencyIds([]);
    }

    /**
     * G12: 検索前空状態の次アクション。直近 7 日間（6 日前〜本日）を検索する。
     *
     * 日付は基準日から先へ並ぶので、本日を基準日にすると本日以外の 6 日が未来で
     * 空になっていた（ユーザー指摘 2026-09-24）。基準日を 6 日前にする。
     * 「本日」は運行日で数える。目撃の日付と同じく 4 時までは前日とみなす
     * （0〜4 時に押すと、まだ何も無い暦の翌日が最後の列になっていた）。
     */
    onDefaultSearch(): void {
        const operatingDay = subHours(new Date(), 4);
        const referenceDate = format(subDays(operatingDay, 6), 'yyyy-MM-dd');
        this.#router.navigate([
            'operation',
            'past-time',
            { reference_date: referenceDate, days: 7 },
        ]);
    }
}
