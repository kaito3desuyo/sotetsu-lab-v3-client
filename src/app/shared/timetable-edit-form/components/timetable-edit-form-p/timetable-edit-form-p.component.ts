import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatLegacySlideToggleChange as MatSlideToggleChange } from '@angular/material/legacy-slide-toggle';
import { RxState } from '@rx-angular/state';
import { plainToClass } from 'class-transformer';
import dayjs from 'dayjs';
import { Observable, Subject } from 'rxjs';
import { filter, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    ITimetableEditForm,
    ITimetableEditFormTrip,
    ITimetableEditFormTripTime,
} from '../../interfaces/timetable-edit-form.interface';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../../special/enums/timetable-edit-form.enum';
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';
import { selectSlice } from '@rx-angular/state/selections';

type State = {
    serviceId: string;
    calendarId: string;
    calendar: CalendarDetailsDto;
    mode: ETimetableEditFormMode;
    tripDirection: ETripDirection;
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    trips: TripDetailsDto[];
};

const constants = {
    timetableEditForm: {
        modeEnum: ETimetableEditFormMode,
        stopTypeEnum: ETimetableEditFormStopType,
    },
} as const;

@Component({
    selector: 'app-timetable-edit-form-p',
    templateUrl: './timetable-edit-form-p.component.html',
    styleUrls: ['./timetable-edit-form-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class TimetableEditFormPComponent {
    readonly constants = constants;
    readonly form: ITimetableEditForm = this.fb.group({
        trips: this.fb.array<ITimetableEditFormTrip>([]),
    });

    get tripsForm(): FormArray<ITimetableEditFormTrip> {
        return this.form.get('trips') as FormArray<ITimetableEditFormTrip>;
    }

    private readonly _unsubscriber$ = new Subject<number>();

    readonly vm$ = this.state.select();

    readonly onClickedAdd$ = new Subject<void>();
    readonly onClickedRemove$ = new Subject<number>();
    readonly onClickedClear$ = new Subject<void>();
    readonly onClickedSubmit$ = new Subject<void>();

    readonly onChangedInputServiceId$ = new Subject<string>();
    readonly onChangedInputCalendarId$ = new Subject<string>();
    readonly onChangedInputCalendar$ = new Subject<CalendarDetailsDto>();
    readonly onChangedInputMode$ = new Subject<ETimetableEditFormMode>();
    readonly onChangedInputTripDirection$ = new Subject<ETripDirection>();
    readonly onChangedInputStations$ = new Subject<StationDetailsDto[]>();
    readonly onChangedInputOperations$ = new Subject<OperationDetailsDto[]>();
    readonly onChangedInputTripClasses$ = new Subject<TripClassDetailsDto[]>();
    readonly onChangedInputTrips$ = new Subject<TripDetailsDto[]>();
    readonly onChangedInputSubmittedEvent$ = new Subject<Observable<void>>();

    @Input() set serviceId(serviceId: string) {
        this.onChangedInputServiceId$.next(serviceId);
    }
    @Input() set calendarId(calendarId: string) {
        this.onChangedInputCalendarId$.next(calendarId);
    }
    @Input() set calendar(calendar: CalendarDetailsDto) {
        this.onChangedInputCalendar$.next(calendar);
    }
    @Input() set mode(mode: ETimetableEditFormMode) {
        this.onChangedInputMode$.next(mode);
    }
    @Input() set tripDirection(tripDirection: ETripDirection) {
        this.onChangedInputTripDirection$.next(tripDirection);
    }
    @Input() set stations(stations: StationDetailsDto[]) {
        this.onChangedInputStations$.next(stations);
    }
    @Input() set operations(operations: OperationDetailsDto[]) {
        this.onChangedInputOperations$.next(operations);
    }
    @Input() set tripClasses(tripClasses: TripClassDetailsDto[]) {
        this.onChangedInputTripClasses$.next(tripClasses);
    }
    @Input() set trips(trips: TripDetailsDto[]) {
        this.onChangedInputTrips$.next(trips);
    }
    @Input() set submittedEvent$(ev: Observable<void>) {
        this.onChangedInputSubmittedEvent$.next(ev);
    }

    @Output() clickSubmit = new EventEmitter<
        CreateTripDto[] | ReplaceTripDto[]
    >();
    @Output() toggleIsSaveTripsIndividually =
        new EventEmitter<MatSlideToggleChange>();

    constructor(
        private readonly cd: ChangeDetectorRef,
        private readonly fb: FormBuilder,
        private readonly state: RxState<State>
    ) {
        this.state.connect(
            'serviceId',
            this.onChangedInputServiceId$.asObservable()
        );
        this.state.connect(
            'calendarId',
            this.onChangedInputCalendarId$.asObservable()
        );
        this.state.connect(
            'calendar',
            this.onChangedInputCalendar$.asObservable()
        );
        this.state.connect('mode', this.onChangedInputMode$.asObservable());
        this.state.connect(
            'tripDirection',
            this.onChangedInputTripDirection$.asObservable()
        );
        this.state.connect(
            'stations',
            this.onChangedInputStations$.asObservable()
        );
        this.state.connect(
            'operations',
            this.onChangedInputOperations$.asObservable()
        );
        this.state.connect(
            'tripClasses',
            this.onChangedInputTripClasses$.asObservable()
        );
        this.state.connect('trips', this.onChangedInputTrips$.asObservable());

        this.state.hold(
            this.state.select('mode').pipe(
                filter((mode) => mode === ETimetableEditFormMode.ADD),
                switchMap(() =>
                    this.state.select(
                        selectSlice([
                            'serviceId',
                            'calendarId',
                            'tripDirection',
                            'stations',
                        ])
                    )
                )
            ),
            () => {
                this._add();
            }
        );

        this.state.hold(
            this.state.select('mode').pipe(
                filter(
                    (mode) =>
                        mode === ETimetableEditFormMode.COPY ||
                        mode === ETimetableEditFormMode.UPDATE
                ),
                switchMap(() =>
                    this.state.select(
                        selectSlice([
                            'serviceId',
                            'calendarId',
                            'tripDirection',
                            'stations',
                            'trips',
                        ])
                    )
                )
            ),
            ({ trips }) => {
                for (const trip of trips) {
                    this._add(trip);
                }
            }
        );

        this.state.hold(this.onClickedAdd$.asObservable(), () => {
            this._add();
        });

        this.state.hold(this.onClickedRemove$.asObservable(), (index) => {
            this._remove(index);
        });

        this.state.hold(this.onClickedClear$.asObservable(), () => {
            this._onReceiveClickClear();
        });

        this.state.hold(this.onClickedSubmit$.asObservable(), () => {
            this._onReceiveClickSubmit();
        });

        this.state.hold(
            this.onChangedInputSubmittedEvent$.pipe(
                mergeMap((ob) => ob),
                mergeMap(() => this.state.select('mode')),
                filter((mode) => mode !== ETimetableEditFormMode.UPDATE)
            ),
            () => {
                this._onReceiveClickClear();
                this.cd.detectChanges();
            }
        );
    }

    private _generateTripFormGroup(
        trip?: TripDetailsDto
    ): ITimetableEditFormTrip {
        if (trip) {
            return this.fb.group({
                tripId: [trip.tripId],
                serviceId: [this.state.get('serviceId'), [Validators.required]],
                tripNumber: [
                    trip.tripNumber,
                    [
                        /* Validators.required */
                    ],
                ],
                tripClassId: [trip.tripClassId, [Validators.required]],
                tripName: [''],
                tripDirection: [
                    this.state.get('tripDirection'),
                    [Validators.required],
                ],
                tripBlockId: [trip.tripBlockId],
                depotIn: [trip.depotIn],
                depotOut: [trip.depotOut],
                calendarId: [
                    this.state.get('calendarId'),
                    [Validators.required],
                ],
                extraCalendarId: [null],
                times: this.fb.array(
                    this.state.get('stations').map((station) =>
                        this._generateTripTimeFormGroup(
                            station,
                            trip.times.find(
                                (o) => o.stationId === station.stationId
                            )
                        )
                    ),
                    [
                        TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                        TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                    ]
                ),
                operationId: [
                    this.state.get('mode') === ETimetableEditFormMode.UPDATE &&
                    trip.tripOperationLists.length
                        ? trip.tripOperationLists[0].operationId
                        : '',
                ],
            });
        }

        return this.fb.group({
            tripId: [null],
            serviceId: [this.state.get('serviceId'), [Validators.required]],
            tripNumber: [
                '',
                [
                    /* Validators.required */
                ],
            ],
            tripClassId: ['', [Validators.required]],
            tripName: [''],
            tripDirection: [
                this.state.get('tripDirection'),
                [Validators.required],
            ],
            tripBlockId: [null],
            depotIn: [false],
            depotOut: [false],
            calendarId: [this.state.get('calendarId'), [Validators.required]],
            extraCalendarId: [null],
            times: this.fb.array(
                this.state
                    .get('stations')
                    .map((station) => this._generateTripTimeFormGroup(station)),
                [
                    TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                    TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                ]
            ),
            operationId: [''],
        });
    }

    private _generateTripTimeFormGroup(
        station: StationDetailsDto,
        time?: TimeDetailsDto
    ): ITimetableEditFormTripTime {
        if (time) {
            return this.fb.group({
                timeId: [time.timeId],
                tripId: [time.tripId],
                stationId: [station.stationId, [Validators.required]],
                stopId: [time.stopId],
                // stopSequence: [null],
                stopType: [
                    (time.pickupType === 1 && time.dropoffType === 1
                        ? ETimetableEditFormStopType.PASS
                        : ETimetableEditFormStopType.STOP) as ETimetableEditFormStopType,
                ],
                arrivalTime: [
                    time.arrivalTime
                        ? dayjs(time.arrivalTime, 'HH:mm:ss').format('HH:mm')
                        : null,
                ],
                departureTime: [
                    time.departureTime
                        ? dayjs(time.departureTime, 'HH:mm:ss').format('HH:mm')
                        : null,
                ],
            });
        }

        return this.fb.group({
            timeId: [null],
            tripId: [null],
            stationId: [station.stationId, [Validators.required]],
            stopId: [null],
            // stopSequence: [null],
            stopType: [
                ETimetableEditFormStopType.NOT_GOING_THROUGH as ETimetableEditFormStopType,
            ],
            arrivalTime: [null],
            departureTime: [null],
        });
    }

    private _changeDisabledStateWhenChangeStopType(
        tripTimesForm: FormArray<ITimetableEditFormTripTime>,
        unsubscribeIndex: number
    ): void {
        const changeDisabledState = (
            stopType: ETimetableEditFormStopType,
            form: ITimetableEditFormTripTime
        ) => {
            switch (stopType) {
                case ETimetableEditFormStopType.STOP:
                case ETimetableEditFormStopType.PASS:
                    form.get('stopId').enable();
                    form.get('arrivalTime').enable();
                    form.get('departureTime').enable();
                    return;
                case ETimetableEditFormStopType.NOT_GOING_THROUGH:
                    form.get('stopId').disable();
                    form.get('arrivalTime').disable();
                    form.get('departureTime').disable();
                    return;
            }
        };

        for (const form of tripTimesForm.controls) {
            changeDisabledState(form.get('stopType').value, form);

            this.state.hold(
                form
                    .get('stopType')
                    .valueChanges.pipe(
                        takeUntil(
                            this._unsubscriber$
                                .asObservable()
                                .pipe(
                                    filter(
                                        (index) => index === unsubscribeIndex
                                    )
                                )
                        )
                    ),
                (stopType) => {
                    changeDisabledState(stopType, form);
                }
            );
        }
    }

    private _add(trip?: TripDetailsDto): void {
        const tripsForm = this.form.get(
            'trips'
        ) as FormArray<ITimetableEditFormTrip>;
        const newTripForm = this._generateTripFormGroup(trip);

        this._changeDisabledStateWhenChangeStopType(
            newTripForm.get('times') as FormArray<ITimetableEditFormTripTime>,
            tripsForm.controls.length
        );

        tripsForm.push(newTripForm);
    }

    private _remove(index: number): void {
        const tripsForm = this.form.get(
            'trips'
        ) as FormArray<ITimetableEditFormTrip>;
        tripsForm.removeAt(index);
    }

    private _formInitialize(): void {
        const tripsForm = this.form.get(
            'trips'
        ) as FormArray<ITimetableEditFormTrip>;

        for (let index = 0; index < tripsForm.controls.length; index++) {
            this._unsubscriber$.next(index);
        }

        tripsForm.clear();

        switch (this.state.get('mode')) {
            case ETimetableEditFormMode.ADD:
                this._add();
                return;
            case ETimetableEditFormMode.COPY:
            case ETimetableEditFormMode.UPDATE:
                for (const trip of this.state.get('trips')) {
                    this._add(trip);
                }
                return;
        }
    }

    private _onReceiveClickClear(): void {
        this._formInitialize();
    }

    private _onReceiveClickSubmit(): void {
        const tripsForm = this.form.get(
            'trips'
        ) as FormArray<ITimetableEditFormTrip>;

        const dto = tripsForm.value.map((trip) => {
            const times = trip.times.filter(
                (o) =>
                    o.stopType !== ETimetableEditFormStopType.NOT_GOING_THROUGH
            );

            return plainToClass(
                this.state.get('mode') === ETimetableEditFormMode.UPDATE
                    ? ReplaceTripDto
                    : CreateTripDto,
                {
                    ...trip,
                    tripId: trip.tripId ?? undefined,
                    tripNumber: trip.tripNumber || '不明',
                    times: times.map((time, index, arr) => {
                        const arrivalTime =
                            time.arrivalTime && index !== 0
                                ? dayjs(time.arrivalTime, 'HH:mm')
                                : null;
                        const departureTime =
                            time.departureTime && index !== arr.length - 1
                                ? dayjs(time.departureTime, 'HH:mm')
                                : null;

                        return {
                            ...time,
                            timeId: time.timeId ?? undefined,
                            stopSequence: index + 1,
                            pickupType:
                                time.stopType ===
                                    ETimetableEditFormStopType.STOP &&
                                index !== arr.length - 1
                                    ? 0
                                    : 1,
                            dropoffType:
                                time.stopType ===
                                    ETimetableEditFormStopType.STOP &&
                                index !== 0
                                    ? 0
                                    : 1,
                            arrivalDays:
                                arrivalTime && index !== 0
                                    ? arrivalTime.hour() < 4
                                        ? 2
                                        : 1
                                    : null,
                            arrivalTime:
                                arrivalTime && index !== 0
                                    ? arrivalTime.format('HH:mm')
                                    : null,
                            departureDays:
                                departureTime && index !== arr.length - 1
                                    ? departureTime.hour() < 4
                                        ? 2
                                        : 1
                                    : null,
                            departureTime:
                                departureTime && index !== arr.length - 1
                                    ? departureTime.format('HH:mm')
                                    : null,
                        };
                    }),
                    tripOperationLists: trip.operationId
                        ? [
                              {
                                  operationId: trip.operationId,
                                  startStationId: times[0]?.stationId ?? null,
                                  endStationId:
                                      times[times.length - 1]?.stationId ??
                                      null,
                              },
                          ]
                        : [],
                },
                classTransformerOptions
            );
        });

        this.clickSubmit.emit(dto);
    }
}
