import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { find, some } from 'lodash-es';
import moment from 'moment';
import { ITrip } from 'src/app/general/interfaces/trip';
import {
    ETimetableStationViewMode,
    ITimetableStation,
} from '../../interfaces/timetable-station';

@Component({
    selector: 'app-timetable-all-line-table-presentational',
    templateUrl: './timetable-all-line-table-presentational.component.html',
    styleUrls: [
        './timetable-all-line-table-presentational.component.scss',
        '../../../../../../assets/fonts/DiaPro-web/DiaPro.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableAllLineTablePresentationalComponent implements OnInit {
    staitonViewMode: typeof ETimetableStationViewMode = ETimetableStationViewMode;

    @Input() tripDirection: '0' | '1';
    @Input() stations: ITimetableStation[];
    @Input() trips: ITrip[];
    @Input() isGroupingMode: boolean;
    @Input() groupingBaseTrip: ITrip;
    @Input() pageSettings: PageEvent = {
        length: 0,
        pageIndex: 0,
        pageSize: 10,
    };

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
        stationIndex: number,
        tripIndex: number
    ) {
        const time = find(trip.times, (o) => {
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

                    const minus1Trip = this.trips[tripIndex - 1];
                    const plus1Time = find(trip.times, (o) => {
                        return (
                            o.stationId === this.stations[stationIndex + 1].id
                        );
                    });
                    if (
                        minus1Trip &&
                        minus1Trip.tripBlockId === trip.tripBlockId &&
                        plus1Time &&
                        some(
                            minus1Trip.times,
                            (o) => o.stationId === station.id
                        )
                    ) {
                        return '⬎';
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
                if (some(trip.times, (o) => o.stationId === stationId)) {
                    isExistTimeBeforeStation = true;
                    break;
                }
            }
            for (let i = stationIndex + 1; i <= this.stations.length - 1; i++) {
                const stationId = this.stations[i].id;
                if (some(trip.times, (o) => o.stationId === stationId)) {
                    isExistTimeAfterStation = true;
                    break;
                }
            }

            if (isExistTimeBeforeStation && isExistTimeAfterStation) {
                return '|';
            }

            const minus1Station = this.stations[stationIndex - 1];
            if (minus1Station) {
                const minus1Time = find(trip.times, (o) => {
                    return o.stationId === minus1Station.id;
                });

                if (
                    minus1Time &&
                    ((mode === 'arrival' &&
                        minus1Station.viewMode ===
                            this.staitonViewMode.ONLY_DEPARTURE) ||
                        (mode === 'departure' &&
                            station.viewMode !==
                                this.staitonViewMode.DEPARTURE_AND_ARRIVAL &&
                            minus1Station.viewMode ===
                                this.staitonViewMode.ONLY_DEPARTURE))
                ) {
                    return '=';
                }
            }

            const plus1Station = this.stations[stationIndex + 1];
            if (plus1Station) {
                const minus1Trip = this.trips[tripIndex - 1];
                const plus1Time = find(trip.times, (o) => {
                    return o.stationId === plus1Station.id;
                });

                if (
                    minus1Trip &&
                    minus1Trip.tripBlockId === trip.tripBlockId &&
                    plus1Time &&
                    some(
                        minus1Trip.times,
                        (o) => o.stationId === plus1Station.id
                    ) &&
                    plus1Station.viewMode !==
                        this.staitonViewMode.DEPARTURE_AND_ARRIVAL
                ) {
                    return '⬎';
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

    isIncludeVisibleColumn(index: number): boolean {
        return (
            this.pageSettings.pageIndex * this.pageSettings.pageSize <= index &&
            index <
                (this.pageSettings.pageIndex + 1) * this.pageSettings.pageSize
        );
    }

    trackByItem(index: number, value: ITrip): string {
        return value ? value.id : null;
    }
}
