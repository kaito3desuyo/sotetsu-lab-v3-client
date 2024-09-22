import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { ITimetableSearchCardForm } from '../../interfaces/timetable-search-card-form.interface';
import { TimetableSearchCardService } from '../../services/timetable-search-card.service';
import { TimetableSearchCardStateQuery } from '../../states/timetable-search-card.state';
import { TimetableSearchCardPComponent } from '../timetable-search-card-p/timetable-search-card-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-search-card-c',
    templateUrl: './timetable-search-card-c.component.html',
    styleUrls: ['./timetable-search-card-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableSearchCardPComponent],
})
export class TimetableSearchCardCComponent {
    private readonly calendarListStateQuery = inject(CalendarListStateQuery);
    private readonly routeStationListStateQuery = inject(
        RouteStationListStateQuery,
    );
    private readonly timetableSearchCardService = inject(
        TimetableSearchCardService,
    );
    private readonly timetableSearchCardStateQuery = inject(
        TimetableSearchCardStateQuery,
    );

    readonly calendars = toSignal(this.calendarListStateQuery.calendars$);
    readonly routeStationLists = toSignal(
        this.routeStationListStateQuery.routeStations$,
    );
    readonly currentState = toSignal(
        this.timetableSearchCardStateQuery.formState$,
    );

    onReceiveClickSearch(state: ITimetableSearchCardForm): void {
        this.timetableSearchCardService.emitSearchTimetableEvent(state);
    }
}
