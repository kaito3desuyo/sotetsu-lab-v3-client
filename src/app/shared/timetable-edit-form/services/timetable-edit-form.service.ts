import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { CreateTripBlockDto } from 'src/app/libs/trip-block/usecase/dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from 'src/app/libs/trip-block/usecase/dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from '../states/timetable-edit-form.state';

@Injectable()
export class TimetableEditFormService {
    readonly #serviceService = inject(ServiceService);
    readonly #operationService = inject(OperationService);
    readonly #tripClassService = inject(TripClassService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);
    readonly #timetableEditFormStateStore = inject(TimetableEditFormStateStore);
    readonly #timetableEditFormStateQuery = inject(TimetableEditFormStateQuery);

    #submittedEvent$ = new Subject<void>();

    createTripBlocks(trips: CreateTripDto[]): Observable<void> {
        const isSaveTripsIndividually =
            this.#timetableEditFormStateQuery.isSaveTripsIndividually;

        const tripBlocks: CreateTripBlockDto[] = isSaveTripsIndividually
            ? trips.map((trip) => ({ tripBlockId: undefined, trips: [trip] }))
            : [{ tripBlockId: undefined, trips }];

        return this.#tripBlockService
            .createMany(tripBlocks)
            .pipe(map(() => undefined));
    }

    replaceTripBlock(trips: ReplaceTripDto[]): Observable<void> {
        const tripBlockId = this.#timetableEditFormStateQuery.tripBlockId;

        const tripBlock: ReplaceTripBlockDto = {
            tripBlockId,
            trips,
        };

        return this.#tripBlockService
            .replaceOne(tripBlockId, tripBlock)
            .pipe(map(() => undefined));
    }

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;

        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                this.#timetableEditFormStateStore.setStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.#timetableEditFormStateQuery.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((operations) =>
                operations
                    .filter((o) => o.operationNumber !== '100')
                    .sort((a, b) =>
                        a.operationNumber.localeCompare(b.operationNumber),
                    ),
            ),
            tap((operations: OperationDetailsDto[]) => {
                this.#timetableEditFormStateStore.setOperations(operations);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                this.#timetableEditFormStateStore.setTripClasses(tripClasses);
            }),
            map(() => undefined),
        );
    }

    fetchTripBlocks(): Observable<void> {
        const tripBlockId = this.#timetableEditFormStateQuery.tripBlockId;

        return this.#tripBlockService.findOneById({ id: tripBlockId }).pipe(
            tap((tripBlock: TripBlockDetailsDto) => {
                this.#timetableEditFormStateStore.setTripDirection(
                    tripBlock.trips[0].tripDirection as ETripDirection,
                );
                this.#timetableEditFormStateStore.setTripBlocks([tripBlock]);
            }),
            map(() => undefined),
        );
    }

    receiveSubmittedEvent(): Observable<void> {
        return this.#submittedEvent$.asObservable();
    }

    emitSubmittedEvent(): void {
        this.#submittedEvent$.next();
    }
}
