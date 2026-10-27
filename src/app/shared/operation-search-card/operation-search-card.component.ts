import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    linkedSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { AppButtonComponent } from '../app-button/app-button.component';
import { PanelCardComponent } from '../panel-card/panel-card.component';
import { toOperationSelectOptions } from '../operation-select-options.util';

@Component({
    selector: 'app-operation-search-card',
    templateUrl: './operation-search-card.component.html',
    styleUrl: './operation-search-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        RouterLinkActive,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatListModule,
        AppButtonComponent,
        PanelCardComponent,
        DateFnsPipe,
    ],
})
export class OperationSearchCardComponent {
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);
    readonly #operationService = inject(OperationService);

    /** 表示中のダイヤ。渡さなければ今日のダイヤ。 */
    readonly calendarId = input<CalendarDetailsDto['calendarId'] | null>(null);
    /** 表示中の運用。渡せば運用番号を選んだ状態で始める。 */
    readonly operationId = input<OperationDetailsDto['operationId'] | null>(
        null,
    );

    readonly calendars = inject(CalendarListState).calendars;
    readonly #todaysCalendarId = inject(TodaysCalendarListState)
        .todaysCalendarId;

    readonly selectedCalendarId = linkedSignal(
        () => this.calendarId() || (this.#todaysCalendarId() ?? null),
    );
    readonly selectedOperationId = linkedSignal(() => this.operationId());

    /** 選んだダイヤの運用（休車の 100 を除き、番号順）。 */
    readonly operations = toSignal(
        toObservable(this.selectedCalendarId).pipe(
            switchMap((calendarId) =>
                calendarId
                    ? this.#operationService
                          .findManyByCalendarId({ calendarId })
                          .pipe(catchError(() => EMPTY))
                    : of([]),
            ),
            map(toOperationSelectOptions),
        ),
        { initialValue: [] },
    );

    selectCalendar(calendarId: CalendarDetailsDto['calendarId']): void {
        this.selectedCalendarId.set(calendarId);
        this.selectedOperationId.set(null);
    }

    selectOperation(operationId: OperationDetailsDto['operationId']): void {
        this.selectedOperationId.set(operationId);
    }

    /** 運用番号まで選んでいれば運用行路図、ダイヤだけなら運用表へ移る。 */
    submit(): void {
        const operationId = this.selectedOperationId();
        const navigation = operationId
            ? this.#router.navigate([
                  '/operation/route-diagram',
                  { operation_id: operationId },
              ])
            : this.#router.navigate([
                  '/operation/table',
                  { calendar_id: this.selectedCalendarId() },
              ]);
        notifyNavigationFailure(navigation, this.#notificationService);
    }
}
