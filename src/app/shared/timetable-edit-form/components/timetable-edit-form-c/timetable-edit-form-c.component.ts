import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { TimetableEditFormService } from '../../services/timetable-edit-form.service';
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

    private readonly _submittedEvent$ = new Subject<void>();
    readonly submittedEvent$ = this._submittedEvent$.asObservable();

    constructor(
        private readonly logger: NGXLogger,
        private readonly notification: NotificationService,
        private readonly serviceListStateQuery: ServiceListStateQuery,
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly timetableEditFormService: TimetableEditFormService,
        private readonly timetableEditFormStateStore: TimetableEditFormStateStore,
        private readonly timetableEditFormStateQuery: TimetableEditFormStateQuery
    ) {}

    async onReceiveClickSubmit(trips: CreateTripDto[]): Promise<void> {
        const result = await tryCatchAsync(
            this.timetableEditFormService.createTripBlocks(trips),
            (e) => e as HttpErrorResponse
        );

        if (result.isFailure()) {
            const e = result.error;
            this.logger.error(e.message, e.error);
            this.notification.open(e.message, 'OK');
            return;
        }

        this.notification.open('列車を追加しました', 'OK');
        this._submittedEvent$.next();
    }

    onReceiveToggleIsSaveTripsIndividually(ev: MatSlideToggleChange) {
        this.timetableEditFormStateStore.setIsSaveTripsIndividually(ev.checked);
    }
}
