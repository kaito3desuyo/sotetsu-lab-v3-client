import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RxState } from '@rx-angular/state';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ITimetableSearchCardForm } from '../../interfaces/timetable-search-card-form.interface';

type Form = FormGroup<{
    calendarId: FormControl<string>;
    tripDirection: FormControl<number>;
    searchByStation: FormControl<boolean>;
    stationId: FormControl<string>;
}>;

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
    ],
})
export class TimetableSearchCardPComponent {
    readonly #fb = inject(FormBuilder).nonNullable;
    readonly #state = inject<RxState<{}>>(RxState);

    readonly form: Form = this.#fb.group({
        calendarId: this.#fb.control('', [Validators.required]),
        tripDirection: this.#fb.control(ETripDirection.INBOUND as number, [
            Validators.required,
        ]),
        searchByStation: this.#fb.control(false, [Validators.required]),
        stationId: this.#fb.control('', [Validators.required]),
    });

    readonly calendars = input.required<CalendarDetailsDto[]>();
    readonly routeStationLists = input.required<RouteStationListDetailsDto[]>();
    readonly currentState = input.required<ITimetableSearchCardForm>();

    readonly clickSearch = output<ITimetableSearchCardForm>();

    constructor() {
        this.#state.hold(
            this.form.get('searchByStation').valueChanges,
            (bool) => {
                if (bool) {
                    this.form.get('stationId').enable();
                } else {
                    this.form.get('stationId').disable();
                }
            },
        );

        this.#state.hold(toObservable(this.currentState), (state) => {
            this.form.patchValue(state);
        });
    }
}
