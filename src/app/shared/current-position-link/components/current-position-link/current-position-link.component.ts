import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

@Component({
    standalone: true,
    selector: 'app-current-position-link',
    templateUrl: './current-position-link.component.html',
    styleUrls: ['./current-position-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, MatIconModule, PipesModule],
})
export class CurrentPositionLinkComponent {
    readonly todaysCalendarId =
        input.required<CalendarDetailsDto['calendarId']>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly currentPosition = input.required<OperationCurrentPositionDto>();

    readonly #prevTrip = computed(() => {
        const currentPosition = this.currentPosition();
        return currentPosition?.position.prev;
    });
    readonly #currentTrip = computed(() => {
        const currentPosition = this.currentPosition();
        return currentPosition?.position.current;
    });
    readonly #nextTrip = computed(() => {
        const currentPosition = this.currentPosition();
        return currentPosition?.position.next;
    });

    readonly isBeforeDepotOut = computed(() => {
        const prev = this.#prevTrip();
        const current = this.#currentTrip();
        const next = this.#nextTrip();

        return !prev && !current && !!next;
    });

    readonly isRunning = computed(() => {
        const prev = this.#prevTrip();
        const current = this.#currentTrip();
        const next = this.#nextTrip();

        return !prev && !!current && !next;
    });

    readonly isGapTime = computed(() => {
        const prev = this.#prevTrip();
        const current = this.#currentTrip();
        const next = this.#nextTrip();

        return !!prev && !current && !!next;
    });

    readonly isAfterDepotIn = computed(() => {
        const prev = this.#prevTrip();
        const current = this.#currentTrip();
        const next = this.#nextTrip();

        return !!prev && !current && !next;
    });

    readonly context = computed(() => {
        const todaysCalendarId = this.todaysCalendarId();
        const stations = this.stations();
        const tripClasses = this.tripClasses();
        const prev = this.#prevTrip();
        const current = this.#currentTrip();
        const next = this.#nextTrip();

        if (!prev && !current && !!next) {
            return {
                todaysCalendarId: todaysCalendarId,
                stations: stations,
                tripClasses: tripClasses,
                trip: undefined,
                hiddenTrip: next?.trip,
                leftTime: undefined,
                leftTimeKey: undefined,
                rightTime: next?.startTime,
                rightTimeKey: 'departureTime',
            };
        }

        if (!prev && !!current && !next) {
            return {
                todaysCalendarId: todaysCalendarId,
                stations: stations,
                tripClasses: tripClasses,
                trip: current?.trip,
                hiddenTrip: undefined,
                leftTime: current?.startTime,
                leftTimeKey: 'departureTime',
                rightTime: current?.endTime,
                rightTimeKey: 'arrivalTime',
            };
        }

        if (!!prev && !current && !!next) {
            return {
                todaysCalendarId: todaysCalendarId,
                stations: stations,
                tripClasses: tripClasses,
                trip: undefined,
                hiddenTrip: prev?.trip,
                leftTime: prev?.endTime,
                leftTimeKey: 'arrivalTime',
                rightTime: next?.startTime,
                rightTimeKey: 'departureTime',
            };
        }

        if (!!prev && !current && !next) {
            return {
                todaysCalendarId: todaysCalendarId,
                stations: stations,
                tripClasses: tripClasses,
                trip: undefined,
                hiddenTrip: prev?.trip,
                leftTime: prev?.endTime,
                leftTimeKey: 'arrivalTime',
                rightTime: undefined,
                rightTimeKey: undefined,
            };
        }

        return undefined;
    });
}
