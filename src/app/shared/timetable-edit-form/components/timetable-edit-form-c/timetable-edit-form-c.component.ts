import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { TimetableEditFormService } from '../../services/timetable-edit-form.service';
import { ETimetableEditFormMode } from '../../special/enums/timetable-edit-form.enum';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from '../../states/timetable-edit-form.state';

@Component({
    selector: 'app-timetable-edit-form-c',
    templateUrl: './timetable-edit-form-c.component.html',
    styleUrls: ['./timetable-edit-form-c.component.scss'],
})
export class TimetableEditFormCComponent {
    readonly serviceId$ = this.serviceListStateQuery.serviceId$;
    readonly calendarId$ = this.timetableEditFormStateQuery.calendarId$;
    readonly calendar$ = this.timetableEditFormStateQuery.calendarId$.pipe(
        switchMap((calendarId) =>
            this.calendarListStateQuery.selectByCalendarId(calendarId)
        )
    );
    readonly mode$ = this.timetableEditFormStateQuery.mode$;
    readonly tripDirection$ = this.timetableEditFormStateQuery.tripDirection$;
    readonly stations$ = this.timetableEditFormStateQuery.stations$;
    readonly operations$ = this.timetableEditFormStateQuery.operations$;
    readonly tripClasses$ = this.timetableEditFormStateQuery.tripClasses$;
    readonly trips$ = this.timetableEditFormStateQuery.trips$;

    private readonly _submittedEvent$ = new Subject<void>();
    readonly submittedEvent$ = this._submittedEvent$.asObservable();

    constructor(
        private readonly loading: LoadingService,
        private readonly error: ErrorHandlerService,
        private readonly notification: NotificationService,
        private readonly serviceListStateQuery: ServiceListStateQuery,
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly timetableEditFormService: TimetableEditFormService,
        private readonly timetableEditFormStateStore: TimetableEditFormStateStore,
        private readonly timetableEditFormStateQuery: TimetableEditFormStateQuery
    ) {}

    async onReceiveClickSubmit(trips: CreateTripDto[]): Promise<void> {
        this.loading.open();

        const result = await tryCatchAsync(
            this.timetableEditFormService.createTripBlocks(trips),
            (e) => e as HttpErrorResponse
        );

        this.loading.close();

        if (result.isFailure()) {
            const e = result.error;
            this.error.handleError(e);
            this.notification.open(e.message, 'OK');
            return;
        }

        const message = () => {
            switch (this.timetableEditFormStateQuery.mode) {
                case ETimetableEditFormMode.ADD:
                    return '列車を追加しました';
                case ETimetableEditFormMode.COPY:
                    return '列車をコピーして追加しました';
                case ETimetableEditFormMode.UPDATE:
                    return '列車を更新しました';
            }
        };

        this.notification.open(message(), 'OK');
        this._submittedEvent$.next();
    }

    onReceiveToggleIsSaveTripsIndividually(ev: MatSlideToggleChange) {
        this.timetableEditFormStateStore.setIsSaveTripsIndividually(ev.checked);
    }
}
