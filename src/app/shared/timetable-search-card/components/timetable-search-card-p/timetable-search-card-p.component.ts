import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { ITimetableSearchCardForm } from '../../interfaces/timetable-search-card-form';

type State = {
    calendars: CalendarDetailsDto[];
    routeStationLists: RouteStationListDetailsDto[];
};

@Component({
    selector: 'app-timetable-search-card-p',
    templateUrl: './timetable-search-card-p.component.html',
    styleUrls: ['./timetable-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class TimetableSearchCardPComponent {
    readonly form = this.fb.group({
        calendarId: [null, Validators.required],
        tripDirection: [0, Validators.required],
        searchByStation: [false, Validators.required],
        stationId: [{ value: null, disabled: true }, Validators.required],
    });

    readonly calendars$ = this.state.select('calendars');
    readonly routeStationLists$ = this.state.select('routeStationLists');

    readonly onChangedInputCalendars$ = new Subject<CalendarDetailsDto[]>();
    readonly onChangedInputRouteStationLists$ = new Subject<
        RouteStationListDetailsDto[]
    >();
    readonly onChangedInputCurrentState$ =
        new Subject<ITimetableSearchCardForm>();

    readonly onClickedSearch$ = new Subject<void>();

    @Input() set calendars(calendars: CalendarDetailsDto[]) {
        this.onChangedInputCalendars$.next(calendars);
    }
    @Input() set routeStationLists(
        routeStationLists: RouteStationListDetailsDto[]
    ) {
        this.onChangedInputRouteStationLists$.next(routeStationLists);
    }
    @Input() set currentState(state: ITimetableSearchCardForm) {
        this.onChangedInputCurrentState$.next(state);
    }

    @Output() clickSearch = new EventEmitter<ITimetableSearchCardForm>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly state: RxState<State>
    ) {
        this.state.connect('calendars', this.onChangedInputCalendars$);
        this.state.connect(
            'routeStationLists',
            this.onChangedInputRouteStationLists$
        );
        this.state.hold(
            this.form.get('searchByStation').valueChanges,
            (bool) => {
                if (bool) {
                    this.form.get('stationId').enable();
                } else {
                    this.form.get('stationId').disable();
                }
            }
        );
        this.state.hold(this.onChangedInputCurrentState$, (state) => {
            this.form.patchValue(state);
        });
        this.state.hold(this.onClickedSearch$, () => {
            this.clickSearch.next(this.form.value);
        });
    }
}
