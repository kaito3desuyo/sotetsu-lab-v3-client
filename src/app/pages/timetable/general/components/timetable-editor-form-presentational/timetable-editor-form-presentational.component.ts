import {
    Component,
    ChangeDetectionStrategy,
    Input,
    OnInit,
    Output,
    EventEmitter,
    ChangeDetectorRef
} from '@angular/core';
import { IStation } from 'src/app/general/interfaces/station';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { IOperation } from 'src/app/general/interfaces/operation';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import find from 'lodash/find';
import sortBy from 'lodash/sortBy';
import { MatRadioChange } from '@angular/material/radio';
import { IStop } from 'src/app/general/models/stop/stop';

import { ITimetableTripForm } from '../../interfaces/timetable-trip-form';
import { Observable } from 'rxjs';
import { ITripBlock } from 'src/app/general/models/trip-block/trip-block';
import { ITrip } from 'src/app/general/interfaces/trip';
import { ITime } from 'src/app/general/interfaces/time';
import moment from 'moment';

@Component({
    selector: 'app-timetable-editor-form-presentational',
    templateUrl: './timetable-editor-form-presentational.component.html',
    styleUrls: ['./timetable-editor-form-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableEditorFormPresentationalComponent implements OnInit {
    tripForm: FormArray = this.fb.array([]);
    tripCount = 0;

    @Input() tripBlock: ITripBlock;
    @Input() stations: IStation[];
    @Input() operations: IOperation[];
    @Input() tripClasses: ITripClass[];
    @Input() clearEvent$: Observable<void>;

    @Output() clickSave: EventEmitter<ITimetableTripForm[]> = new EventEmitter<
        ITimetableTripForm[]
    >();

    constructor(private fb: FormBuilder, private cd: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.formInitialize();

        this.clearEvent$.subscribe(() => {
            this.onClickClear();
        });
    }

    formInitialize() {
        this.tripForm = this.fb.array([]);
        if (this.tripBlock) {
            this.tripCount = this.tripBlock.trips.length;
            this.tripBlock.trips.forEach(trip => {
                this.tripForm.push(this.generateTrip(trip));
            });
        } else {
            this.tripForm.push(this.generateTrip());
        }
        this.cd.markForCheck();
    }

    createTrip(): void {
        this.tripForm.push(this.generateTrip());
    }

    deleteTrip(index: number): void {
        this.tripForm.removeAt(index);
    }

    generateTrip(trip?: ITrip): FormGroup {
        if (trip) {
            return this.fb.group({
                id: [trip.id],
                tripNumber: [trip.tripNumber, Validators.required],
                /*
        tripOperationListId: [
          trip.tripOperationLists.length ? trip.tripOperationLists[0].id : ''
        ],
        */
                operationId: [
                    trip.tripOperationLists.length
                        ? trip.tripOperationLists[0].operationId
                        : ''
                ],
                tripClassId: [trip.tripClassId, Validators.required],
                depotIn: [trip.depotIn],
                depotOut: [trip.depotOut],
                times: this.fb.array(
                    this.stations.map(station =>
                        this.generateTime(
                            station,
                            find(
                                trip.times,
                                time => time.stationId === station.id
                            )
                        )
                    )
                )
            });
        } else {
            return this.fb.group({
                tripNumber: ['', Validators.required],
                operationId: [''],
                tripClassId: ['', Validators.required],
                depotIn: [false],
                depotOut: [false],
                times: this.fb.array(
                    this.stations.map(station => this.generateTime(station))
                )
            });
        }
    }

    generateTime(station: IStation, time?: ITime): FormGroup {
        if (time) {
            return this.fb.group({
                id: [time.id],
                stopType: [
                    time.pickupType === 1 && time.dropoffType === 1
                        ? 'passing'
                        : 'stop',
                    Validators.required
                ],
                stationId: [station.id, Validators.required],
                stopId: [{ value: time.stopId, disabled: false }],
                arrivalTime: [
                    {
                        value: time.arrivalTime
                            ? moment(time.arrivalTime, 'HH:mm:ss').format(
                                  'HH:mm'
                              )
                            : null,
                        disabled: false
                    }
                ],
                departureTime: [
                    {
                        value: time.departureTime
                            ? moment(time.departureTime, 'HH:mm:ss').format(
                                  'HH:mm'
                              )
                            : null,
                        disabled: false
                    }
                ]
            });
        } else {
            return this.fb.group({
                stopType: ['noVia', Validators.required],
                stationId: [station.id, Validators.required],
                stopId: [{ value: '', disabled: true }],
                arrivalTime: [{ value: '', disabled: true }],
                departureTime: [{ value: '', disabled: true }]
            });
        }
    }

    getTime(stationId: string, form: FormArray): FormGroup {
        return find(
            form.controls,
            ctls => ctls.get('stationId').value === stationId
        ) as FormGroup;
    }

    changeStopType(event: MatRadioChange, form: FormGroup): void {
        switch (event.value) {
            case 'stop':
            case 'passing':
                form.get('arrivalTime').enable();
                form.get('departureTime').enable();
                form.get('stopId').enable();
                break;
            case 'noVia':
                form.get('arrivalTime').disable();
                form.get('departureTime').disable();
                form.get('stopId').disable();
        }
    }

    sortStops(array: IStop[]) {
        return sortBy(array, o => o.stopName);
    }

    onClickClear(): void {
        this.formInitialize();
    }

    onClickSave(): void {
        this.clickSave.emit(this.tripForm.value);
    }
}
