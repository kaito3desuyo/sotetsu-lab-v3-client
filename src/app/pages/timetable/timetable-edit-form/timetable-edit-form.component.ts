import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { FilterChipValue } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { TimetableEditFormTripsComponent } from './components/timetable-edit-form-trips/timetable-edit-form-trips.component';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import { ETimetableEditFormMode } from './special/enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from './stores/timetable-edit-form.store';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TimetableEditFormStore.resetLoading();

@Component({
    selector: 'app-timetable-edit-form',
    templateUrl: './timetable-edit-form.component.html',
    styleUrls: ['./timetable-edit-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatProgressBarModule, TimetableEditFormTripsComponent],
})
export class TimetableEditFormComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #snackBar = inject(MatSnackBar);
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #notification = inject(NotificationService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);
    readonly #timetableEditFormService = inject(TimetableEditFormService);

    readonly isLoading = toSignal(TimetableEditFormStore.isLoading$);
    readonly mode = toSignal(TimetableEditFormStore.mode$);
    readonly serviceId = toSignal(this.#serviceListStateQuery.serviceId$);
    readonly calendarId = toSignal(TimetableEditFormStore.calendarId$);
    readonly tripDirection = toSignal(TimetableEditFormStore.tripDirection$);
    readonly calendar = toSignal(TimetableEditFormStore.calendar$, {
        initialValue: null,
    });
    readonly routes = toSignal(TimetableEditFormStore.routes$, {
        initialValue: [],
    });
    readonly selectedRouteIds = toSignal(
        TimetableEditFormStore.selectedRouteIds$,
        { initialValue: [] },
    );
    readonly stations = toSignal(TimetableEditFormStore.sortedStations$, {
        initialValue: [],
    });
    readonly visibleStationIds = toSignal(
        TimetableEditFormStore.sortedVisibleStations$.pipe(
            map((stations) => stations.map((s) => s.stationId)),
        ),
        { initialValue: [] },
    );
    readonly operations = toSignal(TimetableEditFormStore.operations$, {
        initialValue: [],
    });
    readonly tripClasses = toSignal(TimetableEditFormStore.tripClasses$, {
        initialValue: [],
    });
    readonly trips = toSignal(TimetableEditFormStore.trips$, {
        initialValue: [],
    });
    readonly copySourceCandidates = toSignal(
        TimetableEditFormStore.copySourceCandidates$,
        { initialValue: [] },
    );
    readonly selectedTripBlockId = toSignal(
        TimetableEditFormStore.tripBlockId$,
    );
    readonly isSaveTripsIndividually = toSignal(
        TimetableEditFormStore.isSaveTripsIndividually$,
    );
    readonly lastSubmittedAt = toSignal(
        this.#timetableEditFormService
            .receiveSubmittedEvent()
            .pipe(map(() => new Date().getTime())),
    );

    readonly restoreTrips = signal<TripDetailsDto[] | null>(null);

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const mode = this.#route.snapshot.data
                    .mode as ETimetableEditFormMode;
                const calendarId = paramMap.get('calendarId');
                const tripDirection = paramMap.has('trip_direction')
                    ? (Number(
                          paramMap.get('trip_direction'),
                      ) as ETripDirection)
                    : null;
                const tripBlockId = paramMap.get('trip_block_id');

                TimetableEditFormStore.resetForNewSession();
                TimetableEditFormStore.setMode(mode);
                TimetableEditFormStore.setCalendarId(calendarId);
                if (tripDirection !== null) {
                    TimetableEditFormStore.setTripDirection(tripDirection);
                }
                if (tripBlockId) {
                    TimetableEditFormStore.setTripBlockId(tripBlockId);
                }

                this.fetchData();
            });
    }

    async fetchData(): Promise<void> {
        TimetableEditFormStore.enableLoading();

        await lastValueFrom(this.#timetableEditFormService.fetchStations());
        await lastValueFrom(this.#timetableEditFormService.fetchRoutes());
        await lastValueFrom(this.#timetableEditFormService.fetchOperations());
        await lastValueFrom(
            this.#timetableEditFormService.fetchTripClasses(),
        );
        await lastValueFrom(this.#timetableEditFormService.fetchCalendar());

        if (this.mode() === ETimetableEditFormMode.UPDATE) {
            await lastValueFrom(
                this.#timetableEditFormService.fetchTargetTripBlock(),
            );
        } else if (this.mode() === ETimetableEditFormMode.COPY) {
            await lastValueFrom(
                this.#timetableEditFormService.fetchCopySourceCandidates(),
            );
        }

        TimetableEditFormStore.disableLoading();

        this.#proposeDraftRestoreIfAny();
    }

    onSelectCopySource(tripBlockId: string): void {
        lastValueFrom(
            this.#timetableEditFormService.selectCopySource(tripBlockId),
        );
    }

    onRouteFilterChange(values: FilterChipValue[]): void {
        TimetableEditFormStore.setSelectedRouteIds(values as string[]);
    }

    onToggleIsSaveTripsIndividually(ev: MatSlideToggleChange): void {
        TimetableEditFormStore.setIsSaveTripsIndividually(ev.checked);
    }

    onFormValueChange(trips: unknown[]): void {
        this.#timetableEditFormService.saveDraft(trips);
    }

    onDraftRestored(): void {
        this.restoreTrips.set(null);
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

        const result = await tryCatchAsync(
            fn(trips),
            (e) => e as HttpErrorResponse,
        );

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

        this.#notification.open(message(), 'OK');
        this.#timetableEditFormService.clearDraft();
        this.#timetableEditFormService.emitSubmittedEvent();
    }

    #proposeDraftRestoreIfAny(): void {
        const draft = this.#timetableEditFormService.getMatchingDraft();
        if (!draft || draft.trips.length === 0) return;

        const ref = this.#snackBar.open(
            '前回の入力途中データがあります。復元しますか？',
            '復元する',
            { duration: 8000 },
        );

        ref.onAction().subscribe(() => {
            this.restoreTrips.set(draft.trips as unknown as TripDetailsDto[]);
        });
    }
}
