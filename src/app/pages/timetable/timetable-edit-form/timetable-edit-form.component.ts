import { FetchError } from 'src/app/core/classes/custom-error';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, lastValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { NotFoundContentComponent } from 'src/app/shared/not-found-content/not-found-content.component';
import { parseTripDirectionParam } from 'src/app/shared/trip-direction-param.util';
import { parseUuid, readUrlParam } from 'src/app/shared/url-params/url-param';
import { FilterChipValue } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { TimetableEditFormDraftRestoreSnackBarComponent } from './components/timetable-edit-form-draft-restore-snack-bar/timetable-edit-form-draft-restore-snack-bar.component';
import { TimetableEditFormTripsComponent } from './components/timetable-edit-form-trips/timetable-edit-form-trips.component';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import { ITimetableEditFormTripValue } from './interfaces/timetable-edit-form.interface';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from './enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from './stores/timetable-edit-form.store';

@Component({
    selector: 'app-timetable-edit-form',
    templateUrl: './timetable-edit-form.component.html',
    styleUrl: './timetable-edit-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        NotFoundContentComponent,
        SkeletonBarComponent,
        TimetableEditFormTripsComponent,
    ],
})
export class TimetableEditFormComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #snackBar = inject(MatSnackBar);
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #notification = inject(NotificationService);
    readonly #serviceListState = inject(ServiceListState);
    readonly #timetableEditFormService = inject(TimetableEditFormService);
    readonly #store = inject(TimetableEditFormStore);
    readonly #pageNotFound = inject(PageNotFound);
    readonly #pageMeta = inject(PageMeta);

    readonly isLoading = this.#store.isLoading;
    readonly hasFetchedEditForm = this.#store.hasFetchedEditForm;
    readonly mode = this.#store.mode;
    readonly EMode = ETimetableEditFormMode;
    /** 骨組みの格子の行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonGridRows = Array.from({ length: 14 }, (_, i) => i);
    readonly serviceId = this.#serviceListState.serviceId;
    readonly calendarId = this.#store.calendarId;
    readonly tripDirection = this.#store.tripDirection;
    readonly calendar = this.#store.calendar;
    readonly routes = this.#store.routes;
    readonly selectedRouteIds = this.#store.selectedRouteIds;
    readonly stations = this.#store.sortedStations;
    readonly visibleStationIds = computed(() =>
        this.#store.sortedVisibleStations().map((s) => s.stationId),
    );
    readonly operations = this.#store.operations;
    readonly tripClasses = this.#store.tripClasses;
    readonly trips = this.#store.trips;
    readonly copySourceCandidates = this.#store.copySourceCandidates;
    readonly selectedTripBlockId = this.#store.tripBlockId;
    readonly isSaveTripsIndividually = this.#store.isSaveTripsIndividually;
    readonly lastSubmittedAt = toSignal(
        this.#timetableEditFormService
            .receiveSubmittedEvent()
            .pipe(map(() => new Date().getTime())),
    );

    readonly restoreTrips = signal<ITimetableEditFormTripValue[] | null>(null);

    /**
     * URL に値があるのに不正、または api が「無い」と返したダイヤ・列車のとき true
     * （フォームの代わりに見つからない表示を出す）。ブラウザで描くページなので 404 は返せない
     */
    readonly notFound = signal(false);

    constructor() {
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前のフォームが一瞬出ないようにする
        this.#store.setHasFetchedEditForm(false);

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const mode = this.#route.snapshot.data
                    .mode as ETimetableEditFormMode;
                const calendarIdParam = readUrlParam(
                    paramMap.get('calendar_id'),
                    parseUuid,
                );
                const tripDirectionParam = readUrlParam(
                    paramMap.get('trip_direction'),
                    parseTripDirectionParam,
                );
                const tripBlockIdParam = readUrlParam(
                    paramMap.get('trip_block_id'),
                    parseUuid,
                );

                // 値があるのに不正（"undefined"・"abc" など）なら、見つからない表示にして取得しない。
                // 下書き・設定は消さない。前の URL の取得の結果が今の URL に効かないよう世代を進める
                if (
                    calendarIdParam.kind === 'invalid' ||
                    tripDirectionParam.kind === 'invalid' ||
                    tripBlockIdParam.kind === 'invalid'
                ) {
                    this.#store.nextFetchSeq();
                    this.#store.setMode(mode);
                    this.#draftRestoreRef?.dismiss();
                    this.#markNotFound();
                    return;
                }
                this.#unmarkNotFound();

                // 値が無いものは今までどおり（ダイヤ・向き・列車を決めないまま取得する）
                const calendarId =
                    calendarIdParam.kind === 'ok'
                        ? calendarIdParam.value
                        : null;
                const tripDirection =
                    tripDirectionParam.kind === 'ok'
                        ? tripDirectionParam.value
                        : null;
                const tripBlockId =
                    tripBlockIdParam.kind === 'ok'
                        ? tripBlockIdParam.value
                        : null;

                this.#store.resetForNewSession();
                this.#store.setMode(mode);
                this.#store.setCalendarId(calendarId);
                if (tripDirection !== null) {
                    this.#store.setTripDirection(tripDirection);
                }
                if (tripBlockId) {
                    this.#store.setTripBlockId(tripBlockId);
                }

                this.fetchData();
            });
    }

    #markNotFound(): void {
        this.notFound.set(true);
        this.#pageNotFound.mark();
    }

    /** 見つからない表示から戻るとき、mark() が入れた題名をルートの題名へ戻す */
    #unmarkNotFound(): void {
        if (!this.notFound()) return;
        this.notFound.set(false);
        const title = this.#route.snapshot.data.title as string | undefined;
        if (title) this.#pageMeta.setTitle(title);
    }

    async fetchData(): Promise<void> {
        const seq = this.#store.nextFetchSeq();
        this.#store.enableLoading();
        this.#store.setHasFetchedEditForm(false);

        try {
            // 5 本は互いに依存しないので同時に投げる
            const [, , , , calendarFound] = await lastValueFrom(
                forkJoin([
                    this.#timetableEditFormService.fetchStations(),
                    this.#timetableEditFormService.fetchRoutes(),
                    this.#timetableEditFormService.fetchOperations(),
                    this.#timetableEditFormService.fetchTripClasses(),
                    this.#timetableEditFormService.fetchCalendar(),
                ]),
            );
            // 前の URL の取得なら、決めることも続きを取ることもしない
            if (!this.#store.isLatestFetch(seq)) return;
            // api が「無い」と返した（失敗ではない）ときだけ、見つからない表示にする
            if (calendarFound === false) {
                this.#markNotFound();
                return;
            }

            if (this.mode() === ETimetableEditFormMode.UPDATE) {
                const found = await lastValueFrom(
                    this.#timetableEditFormService.fetchTargetTripBlock(),
                );
                if (!this.#store.isLatestFetch(seq)) return;
                if (found === false) {
                    this.#markNotFound();
                    return;
                }
            } else {
                // COPY のコピー元は別のダイヤの列車でもよい。先に ID で取り、
                // フォームに入れると同時に向きを決める（URL に向きは無い）。
                if (this.mode() === ETimetableEditFormMode.COPY) {
                    const found = await lastValueFrom(
                        this.#timetableEditFormService.fetchTargetTripBlock(),
                    );
                    if (!this.#store.isLatestFetch(seq)) return;
                    if (found === false) {
                        this.#markNotFound();
                        return;
                    }
                }
                // G9: ADD/COPY 両モードで「既存列車からコピー」を提供するため、
                // コピー元候補（同一ダイヤ・同一方向の trip-block 一覧）を取得する。
                await lastValueFrom(
                    this.#timetableEditFormService.fetchCopySourceCandidates(),
                );
            }
        } finally {
            this.#store.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (this.#store.isLatestFetch(seq)) {
                this.#store.setHasFetchedEditForm(true);
            }
        }

        if (this.notFound() || !this.#store.isLatestFetch(seq)) return;
        this.#proposeDraftRestoreIfAny();
    }

    onSelectCopySource(tripBlockId: string): void {
        lastValueFrom(
            this.#timetableEditFormService.selectCopySource(tripBlockId),
        );
    }

    onRouteFilterChange(values: FilterChipValue[]): void {
        this.#store.setSelectedRouteIds(values as string[]);
    }

    onToggleIsSaveTripsIndividually(ev: MatSlideToggleChange): void {
        this.#store.setIsSaveTripsIndividually(ev.checked);
    }

    onFormValueChange(trips: unknown[]): void {
        this.#timetableEditFormService.saveDraft(trips);
    }

    onDraftRestored(): void {
        this.restoreTrips.set(null);
    }

    /** G9: sticky 下部バー「下書き保存」の明示クリック時のフィードバック（保存自体は自動保存と同経路） */
    onSaveDraftClick(): void {
        this.#notification.open('下書きを保存しました', 'OK');
    }

    async onReceiveClickSubmit(
        trips: CreateTripDto[] | ReplaceTripDto[],
    ): Promise<void> {
        const isCreateTripDto = (_: unknown): _ is CreateTripDto[] => {
            return (
                this.mode() === ETimetableEditFormMode.ADD ||
                this.mode() === ETimetableEditFormMode.COPY
            );
        };

        const isReplaceTripDto = (_: unknown): _ is ReplaceTripDto[] => {
            return this.mode() === ETimetableEditFormMode.UPDATE;
        };

        const fn = (
            trips: CreateTripDto[] | ReplaceTripDto[],
        ): Observable<void> => {
            if (isCreateTripDto(trips)) {
                return this.#timetableEditFormService.createTripBlocks(trips);
            } else if (isReplaceTripDto(trips)) {
                return this.#timetableEditFormService.replaceTripBlock(trips);
            }
        };

        this.#loading.open();

        const result = await tryCatchAsync(fn(trips), (e) => e as FetchError);

        this.#loading.close();

        if (result.isFailure()) {
            const e = result.error;
            this.#error.handleError(e);
            this.#notification.open(e.message, 'OK');
            return;
        }

        const message = () => {
            switch (this.mode()) {
                case ETimetableEditFormMode.ADD:
                    return '列車を追加しました';
                case ETimetableEditFormMode.COPY:
                    return '列車をコピーして追加しました';
                case ETimetableEditFormMode.UPDATE:
                    return '列車を更新しました';
            }
        };

        this.#draftRestoreRef?.dismiss();
        this.#notification.open(message(), 'OK');
        this.#timetableEditFormService.clearDraft();
        this.#timetableEditFormService.emitSubmittedEvent();
    }

    #draftRestoreRef: MatSnackBarRef<TimetableEditFormDraftRestoreSnackBarComponent> | null =
        null;

    #proposeDraftRestoreIfAny(): void {
        const draft = this.#timetableEditFormService.getMatchingDraft();
        if (!draft || draft.trips.length === 0) return;

        // 自動では消さない（8 秒で消えると見逃して戻せなかった）。閉じるか復元するまで残す
        const ref = this.#snackBar.openFromComponent(
            TimetableEditFormDraftRestoreSnackBarComponent,
        );
        this.#draftRestoreRef = ref;
        this.#destroyRef.onDestroy(() => ref.dismiss());

        ref.onAction().subscribe(() => {
            const trips = draft.trips as ITimetableEditFormTripValue[];
            this.#timetableEditFormService.selectRoutesTraversedBy(
                trips.map((trip) =>
                    (trip.times ?? [])
                        .filter(
                            (time) =>
                                time.stopType !==
                                ETimetableEditFormStopType.NOT_GOING_THROUGH,
                        )
                        .map((time) => time.stationId),
                ),
            );
            this.restoreTrips.set(trips);
        });
    }
}
