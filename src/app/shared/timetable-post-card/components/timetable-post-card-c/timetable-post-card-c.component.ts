import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';
import { TimetablePostCardService } from '../../services/timetable-post-card.service';
import { TimetablePostCardPComponent } from '../timetable-post-card-p/timetable-post-card-p.component';

@Component({
    selector: 'app-timetable-post-card-c',
    templateUrl: './timetable-post-card-c.component.html',
    styleUrls: ['./timetable-post-card-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetablePostCardPComponent]
})
export class TimetablePostCardCComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #timetablePostCardService = inject(TimetablePostCardService);

    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$);

    onReceiveClickMoveTimetableAdd(state: ITimetablePostCardForm): void {
        this.#timetablePostCardService.emitMoveTimetableAddEvent(state);
    }
}
