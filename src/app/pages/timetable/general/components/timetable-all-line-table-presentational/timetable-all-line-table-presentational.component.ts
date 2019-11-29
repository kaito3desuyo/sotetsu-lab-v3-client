import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter
} from '@angular/core';
import {
    ITimetableStation,
    ETimetableStationViewMode
} from '../../interfaces/timetable-station';
import { ITrip } from 'src/app/general/interfaces/trip';
import find from 'lodash/find';
import some from 'lodash/some';
import moment from 'moment';

@Component({
    selector: 'app-timetable-all-line-table-presentational',
    templateUrl: './timetable-all-line-table-presentational.component.html',
    styleUrls: [
        './timetable-all-line-table-presentational.component.scss',
        '../../../../../../assets/fonts/DiaPro-web/DiaPro.css'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableAllLineTablePresentationalComponent implements OnInit {
    staitonViewMode: typeof ETimetableStationViewMode = ETimetableStationViewMode;

    @Input() tripDirection: '0' | '1';
    @Input() stations: ITimetableStation[];
    @Input() trips: ITrip[];
    @Input() isGroupingMode: boolean;
    @Input() groupingBaseTrip: ITrip;

    @Output() clickEdit: EventEmitter<string> = new EventEmitter<string>();
    @Output() clickDelete: EventEmitter<ITrip> = new EventEmitter<ITrip>();
    @Output() clickGrouping: EventEmitter<ITrip> = new EventEmitter<ITrip>();
    @Output() clickAddTripInGroup: EventEmitter<ITrip> = new EventEmitter<
        ITrip
    >();
    @Output() clickRemoveTripInGroup: EventEmitter<ITrip> = new EventEmitter<
        ITrip
    >();

    constructor() {}

    ngOnInit() {}

    getTime(
        mode: 'arrival' | 'departure',
        station: ITimetableStation,
        trip: ITrip,
        stationIndex: number
    ) {
        const time = find(trip.times, o => {
            return o.stationId === station.id;
        });

        if (time) {
            switch (true) {
                case mode === 'arrival' &&
                    station.viewMode ===
                        this.staitonViewMode.DEPARTURE_AND_ARRIVAL:
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.arrivalTime
                    ) {
                        return '↓';
                    }

                    if (!time.arrivalTime) {
                        return '‥';
                    }

                    return this.formatTime(time.arrivalTime);
                case mode === 'arrival':
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.arrivalTime
                    ) {
                        return '↓';
                    }
                    return this.formatTime(time.arrivalTime);
                case mode === 'departure' &&
                    station.viewMode === this.staitonViewMode.ONLY_DEPARTURE:
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.departureTime
                    ) {
                        return '↓';
                    }

                    if (!time.departureTime) {
                        return this.formatTime(time.arrivalTime);
                    }

                    return this.formatTime(time.departureTime);
                case mode === 'departure' &&
                    station.viewMode ===
                        this.staitonViewMode.DEPARTURE_AND_ARRIVAL:
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.departureTime
                    ) {
                        return '↓';
                    }

                    if (!time.departureTime) {
                        return '‥';
                    }

                    return this.formatTime(time.departureTime);
                case mode === 'departure':
                    if (
                        time.pickupType === 1 &&
                        time.dropoffType === 1 &&
                        !time.departureTime
                    ) {
                        return '↓';
                    }
                    return this.formatTime(time.departureTime);
            }
        } else {
            let isExistTimeBeforeStation = false;
            let isExistTimeAfterStation = false;
            for (let i = 0; i < stationIndex; i++) {
                const stationId = this.stations[i].id;
                if (some(trip.times, o => o.stationId === stationId)) {
                    isExistTimeBeforeStation = true;
                    break;
                }
            }
            for (let i = stationIndex; i < this.stations.length - 1; i++) {
                const stationId = this.stations[i].id;
                if (some(trip.times, o => o.stationId === stationId)) {
                    isExistTimeAfterStation = true;
                    break;
                }
            }

            if (isExistTimeBeforeStation && isExistTimeAfterStation) {
                return '|';
            }

            const minus1Station = this.stations[stationIndex - 1];
            if (minus1Station) {
                const minus1Time = find(trip.times, o => {
                    return o.stationId === minus1Station.id;
                });

                if (
                    minus1Time &&
                    ((mode === 'arrival' &&
                        station.viewMode ===
                            this.staitonViewMode.DEPARTURE_AND_ARRIVAL) ||
                        (mode === 'departure' &&
                            station.viewMode ===
                                this.staitonViewMode.ONLY_DEPARTURE &&
                            minus1Station.viewMode ===
                                this.staitonViewMode.ONLY_DEPARTURE))
                ) {
                    return '=';
                }
            }

            return '‥';
        }
    }

    formatTime(timeString: string) {
        let time = moment(timeString, 'HH:mm:ss').format('Hmm');
        if (time.length === 3) {
            time = '-' + time;
        }
        return timeString ? time : '';
    }

    onClickEdit(blockId: string): void {
        this.clickEdit.emit(blockId);
    }

    onClickDelete(trip: ITrip): void {
        this.clickDelete.emit(trip);
    }

    onClickGrouping(trip: ITrip): void {
        this.clickGrouping.emit(trip);
    }

    onClickAddTripInGroup(trip: ITrip): void {
        this.clickAddTripInGroup.emit(trip);
    }

    onClickRemoveTripInGroup(trip: ITrip): void {
        this.clickRemoveTripInGroup.emit(trip);
    }
}
