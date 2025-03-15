import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { TimetableEditFormService } from '../../services/timetable-edit-form.service';
import { ETimetableEditFormMode } from '../../special/enums/timetable-edit-form.enum';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from '../../states/timetable-edit-form.state';
import { TimetableEditFormPComponent } from '../timetable-edit-form-p/timetable-edit-form-p.component';

@Component({
    selector: 'app-timetable-edit-form-c',
    templateUrl: './timetable-edit-form-c.component.html',
    styleUrls: ['./timetable-edit-form-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableEditFormPComponent]
})
export class TimetableEditFormCComponent {
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #notification = inject(NotificationService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #timetableEditFormService = inject(TimetableEditFormService);
    readonly #timetableEditFormStateStore = inject(TimetableEditFormStateStore);
    readonly #timetableEditFormStateQuery = inject(TimetableEditFormStateQuery);

    readonly serviceId = toSignal(this.#serviceListStateQuery.serviceId$);
    readonly calendarId = toSignal(
        this.#timetableEditFormStateQuery.calendarId$,
    );
    readonly calendar = toSignal(
        this.#timetableEditFormStateQuery.calendarId$.pipe(
            switchMap((calendarId) =>
                this.#calendarListStateQuery.selectByCalendarId(calendarId),
            ),
        ),
    );
    readonly mode = toSignal(this.#timetableEditFormStateQuery.mode$);
    readonly tripDirection = toSignal(
        this.#timetableEditFormStateQuery.tripDirection$,
    );
    readonly stations = toSignal(this.#timetableEditFormStateQuery.stations$);
    readonly operations = toSignal(
        this.#timetableEditFormStateQuery.operations$,
    );
    readonly tripClasses = toSignal(
        this.#timetableEditFormStateQuery.tripClasses$,
    );
    readonly trips = toSignal(this.#timetableEditFormStateQuery.trips$);
    readonly lastSubmittedAt = toSignal(
        this.#timetableEditFormService
            .receiveSubmittedEvent()
            .pipe(map(() => new Date().getTime())),
    );

    async onReceiveClickSubmit(
        trips: CreateTripDto[] | ReplaceTripDto[],
    ): Promise<void> {
        const isCreateTripDto = (_: unknown): _ is CreateTripDto[] => {
            return (
                this.#timetableEditFormStateQuery.mode ===
                    ETimetableEditFormMode.ADD ||
                this.#timetableEditFormStateQuery.mode ===
                    ETimetableEditFormMode.COPY
            );
        };

        const isReplaceTripDto = (_: unknown): _ is ReplaceTripDto[] => {
            return (
                this.#timetableEditFormStateQuery.mode ===
                ETimetableEditFormMode.UPDATE
            );
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
            switch (this.#timetableEditFormStateQuery.mode) {
                case ETimetableEditFormMode.ADD:
                    return '列車を追加しました';
                case ETimetableEditFormMode.COPY:
                    return '列車をコピーして追加しました';
                case ETimetableEditFormMode.UPDATE:
                    return '列車を更新しました';
            }
        };

        this.#notification.open(message(), 'OK');
        this.#timetableEditFormService.emitSubmittedEvent();
    }

    onReceiveToggleIsSaveTripsIndividually(ev: MatSlideToggleChange) {
        this.#timetableEditFormStateStore.setIsSaveTripsIndividually(
            ev.checked,
        );
    }
}
