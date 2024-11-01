import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ITimetableSearchCardForm } from '../interfaces/timetable-search-card-form.interface';

type State = ITimetableSearchCardForm;

@Injectable()
export class TimetableSearchCardStateStore {
    readonly state = createElfStore<State>({
        name: 'TimetableSearchCard',
        initialValue: {
            calendarId: '',
            tripDirection: ETripDirection.INBOUND,
            searchByStation: false,
            stationId: '',
        },
    });

    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        this.state.update(
            setProps({
                calendarId,
            }),
        );
    }

    setTripDirection(tripDirection: TripDetailsDto['tripDirection']): void {
        this.state.update(
            setProps({
                tripDirection,
            }),
        );
    }

    enableSearchByStation(): void {
        this.state.update(
            setProps({
                searchByStation: true,
            }),
        );
    }

    disableSearchByStation(): void {
        this.state.update(
            setProps({
                searchByStation: false,
            }),
        );
    }

    setStationId(stationId: StationDetailsDto['stationId']): void {
        this.state.update(
            setProps({
                stationId,
            }),
        );
    }
}

@Injectable()
export class TimetableSearchCardStateQuery {
    readonly #store = inject(TimetableSearchCardStateStore);

    readonly formState$ = this.#store.state.pipe(
        select((state) => ({
            calendarId: state.calendarId,
            tripDirection: state.tripDirection,
            searchByStation: state.searchByStation,
            stationId: state.stationId,
        })),
    );
}
