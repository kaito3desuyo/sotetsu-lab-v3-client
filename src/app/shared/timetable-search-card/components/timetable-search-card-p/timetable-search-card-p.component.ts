import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RxState } from '@rx-angular/state';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
import { Subject } from 'rxjs';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { ITimetableSearchCardForm } from '../../interfaces/timetable-search-card-form.interface';

type State = {
    calendars: CalendarDetailsDto[];
    routeStationLists: RouteStationListDetailsDto[];
};

@Component({
    standalone: true,
    selector: 'app-timetable-search-card-p',
    templateUrl: './timetable-search-card-p.component.html',
    styleUrls: ['./timetable-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatRadioModule,
        MatButtonModule,
        PipesModule,
        LetModule,
        IfModule,
        ForModule,
    ],
})
export class TimetableSearchCardPComponent {
    private readonly fb = inject(FormBuilder);
    private readonly state = inject<RxState<State>>(RxState);

    readonly form = this.fb.nonNullable.group({
        calendarId: ['', Validators.required],
        tripDirection: [0, Validators.required],
        searchByStation: [false, Validators.required],
        stationId: [{ value: '', disabled: true }, Validators.required],
    });

    readonly vm$ = this.state.select();

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

    constructor() {
        this.state.connect(
            'calendars',
            this.onChangedInputCalendars$.asObservable()
        );
        this.state.connect(
            'routeStationLists',
            this.onChangedInputRouteStationLists$.asObservable()
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
        this.state.hold(
            this.onChangedInputCurrentState$.asObservable(),
            (state) => {
                this.form.patchValue(state);
            }
        );
        this.state.hold(this.onClickedSearch$.asObservable(), () => {
            this.clickSearch.next(this.form.value);
        });
    }
}
