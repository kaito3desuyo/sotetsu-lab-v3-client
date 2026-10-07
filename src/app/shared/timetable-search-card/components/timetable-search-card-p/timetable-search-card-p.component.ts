import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import {
    takeUntilDestroyed,
    toObservable,
    toSignal,
} from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { RouteStationListDetailsDto } from 'src/app/libs/route/usecase/dtos/route-station-list-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { AppButtonComponent } from '../../../app-button/app-button.component';
import { PanelCardComponent } from '../../../panel-card/panel-card.component';
import { SegmentToggleComponent } from '../../../segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from '../../../segment-toggle/segment-toggle-option.type';
import { ITimetableSearchCardForm } from '../../interfaces/timetable-search-card-form.interface';
import { StationGroup } from '../../../station-groups.util';

type Form = FormGroup<{
    calendarId: FormControl<string>;
    tripDirection: FormControl<number>;
    searchByStation: FormControl<boolean>;
    stationId: FormControl<string>;
}>;

@Component({
    selector: 'app-timetable-search-card-p',
    templateUrl: './timetable-search-card-p.component.html',
    styleUrls: ['./timetable-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        SegmentToggleComponent,
        PanelCardComponent,
        AppButtonComponent,
        DateFnsPipe,
    ],
})
export class TimetableSearchCardPComponent {
    readonly #fb = inject(FormBuilder).nonNullable;

    readonly tripDirectionEnum = ETripDirection;

    /** 上り/下り 全幅2セグメントトグルの選択肢（98 G0-3・モック10） */
    readonly tripDirectionOptions: readonly [
        SegmentToggleOption,
        SegmentToggleOption,
    ] = [
        { value: ETripDirection.INBOUND, label: '上り' },
        { value: ETripDirection.OUTBOUND, label: '下り' },
    ];

    readonly form: Form = this.#fb.group({
        calendarId: this.#fb.control('', [Validators.required]),
        tripDirection: this.#fb.control(ETripDirection.INBOUND as number, [
            Validators.required,
        ]),
        searchByStation: this.#fb.control(false, [Validators.required]),
        stationId: this.#fb.control('', [Validators.required]),
    });

    readonly tripDirection = toSignal(
        this.form.get('tripDirection').valueChanges,
        { initialValue: this.form.get('tripDirection').value },
    );

    readonly calendars = input.required<CalendarDetailsDto[]>();
    /** 駅 select の選択肢（「会社名 路線名」でまとめる。駅別時刻表と共通）。 */
    readonly stationGroups = input.required<StationGroup[]>();
    readonly currentState = input.required<ITimetableSearchCardForm>();

    readonly clickSearch = output<ITimetableSearchCardForm>();

    constructor() {
        this.form
            .get('searchByStation')
            .valueChanges.pipe(takeUntilDestroyed())
            .subscribe((bool) => {
                if (bool) {
                    this.form.get('stationId').enable();
                } else {
                    this.form.get('stationId').disable();
                }
            });

        toObservable(this.currentState)
            .pipe(takeUntilDestroyed())
            .subscribe((state) => {
                this.form.patchValue(state);
            });
    }

    onTripDirectionChange(value: number): void {
        this.form.get('tripDirection').setValue(value);
    }
}
