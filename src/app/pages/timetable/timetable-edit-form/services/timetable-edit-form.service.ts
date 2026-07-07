import { inject, Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
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
    draftMatchesContext,
    TimetableEditFormDraft,
    TimetableEditFormDraftStore,
} from '../stores/timetable-edit-form-draft.store';
import { TimetableEditFormStore } from '../stores/timetable-edit-form.store';

@Injectable()
export class TimetableEditFormService {
    readonly #serviceService = inject(ServiceService);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #tripClassService = inject(TripClassService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);

    #submittedEvent$ = new Subject<void>();

    fetchCalendar(): Observable<void> {
        const calendarId = TimetableEditFormStore.calendarId;

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((data: CalendarDetailsDto) => {
                TimetableEditFormStore.setCalendar(data);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;

        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                TimetableEditFormStore.setStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    /** B8-1: 路線チップの選択肢。初回取得時は全路線を選択済み状態にする（情報削減にならないよう既定は全表示）。 */
    fetchRoutes(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;

        return this.#serviceService.findOneWithRoutes({ serviceId }).pipe(
            tap((data) => {
                const routes = data.routes as RouteDetailsDto[];
                TimetableEditFormStore.setRoutes(routes);
                TimetableEditFormStore.setSelectedRouteIds(
                    routes.map((route) => route.routeId),
                );
            }),
            map(() => undefined),
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = TimetableEditFormStore.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((operations) =>
                operations
                    .filter((o) => o.operationNumber !== '100')
                    .sort((a, b) =>
                        a.operationNumber.localeCompare(b.operationNumber),
                    ),
            ),
            tap((operations: OperationDetailsDto[]) => {
                TimetableEditFormStore.setOperations(operations);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                TimetableEditFormStore.setTripClasses(tripClasses);
            }),
            map(() => undefined),
        );
    }

    /** UPDATE モード: 編集対象の trip-block を固定 ID で取得する。 */
    fetchTargetTripBlock(): Observable<void> {
        const tripBlockId = TimetableEditFormStore.tripBlockId;

        if (!tripBlockId) {
            TimetableEditFormStore.setTargetTripBlock(null);
            return of(undefined);
        }

        return this.#tripBlockService.findOneById({ id: tripBlockId }).pipe(
            tap((tripBlock: TripBlockDetailsDto) => {
                const firstTrip = tripBlock.trips?.[0];
                if (firstTrip?.tripDirection !== undefined) {
                    TimetableEditFormStore.setTripDirection(
                        firstTrip.tripDirection as ETripDirection,
                    );
                }
                TimetableEditFormStore.setTargetTripBlock(tripBlock);
            }),
            map(() => undefined),
        );
    }

    /** COPY モード: D-5 trip-block 単位のコピー元候補一覧（同一ダイヤ・同一方向）。 */
    fetchCopySourceCandidates(): Observable<void> {
        const calendarId = TimetableEditFormStore.calendarId;
        const tripDirection = TimetableEditFormStore.tripDirection;

        return this.#tripBlockService
            .findManyByFilter({ calendarId, tripDirection })
            .pipe(
                tap((tripBlocks: TripBlockDetailsDto[]) => {
                    TimetableEditFormStore.setCopySourceCandidates(
                        tripBlocks,
                    );

                    const preselected = TimetableEditFormStore.tripBlockId;
                    const match = tripBlocks.find(
                        (o) => o.tripBlockId === preselected,
                    );
                    if (match) {
                        TimetableEditFormStore.setTargetTripBlock(match);
                    }
                }),
                map(() => undefined),
            );
    }

    /** COPY モード: コピー元 trip-block をユーザーが選び直したとき */
    selectCopySource(tripBlockId: string | null): Observable<void> {
        TimetableEditFormStore.setTripBlockId(tripBlockId);

        if (!tripBlockId) {
            TimetableEditFormStore.setTargetTripBlock(null);
            return of(undefined);
        }

        return this.#tripBlockService.findOneById({ id: tripBlockId }).pipe(
            tap((tripBlock: TripBlockDetailsDto) => {
                TimetableEditFormStore.setTargetTripBlock(tripBlock);
            }),
            map(() => undefined),
        );
    }

    createTripBlocks(trips: CreateTripDto[]): Observable<void> {
        const isSaveTripsIndividually =
            TimetableEditFormStore.isSaveTripsIndividually;

        const tripBlocks: CreateTripBlockDto[] = isSaveTripsIndividually
            ? trips.map((trip) => ({ tripBlockId: undefined, trips: [trip] }))
            : [{ tripBlockId: undefined, trips }];

        return this.#tripBlockService
            .createMany(tripBlocks)
            .pipe(map(() => undefined));
    }

    replaceTripBlock(trips: ReplaceTripDto[]): Observable<void> {
        const tripBlockId = TimetableEditFormStore.tripBlockId;

        const tripBlock: ReplaceTripBlockDto = {
            tripBlockId,
            trips,
        };

        return this.#tripBlockService
            .replaceOne(tripBlockId, tripBlock)
            .pipe(map(() => undefined));
    }

    receiveSubmittedEvent(): Observable<void> {
        return this.#submittedEvent$.asObservable();
    }

    emitSubmittedEvent(): void {
        this.#submittedEvent$.next();
    }

    /** D-11: 下書きは独自 localStorage 直叩きをせず elf-persist-state 経由で保存する。 */
    saveDraft(trips: unknown[]): void {
        TimetableEditFormDraftStore.saveDraft(
            {
                mode: TimetableEditFormStore.mode,
                calendarId: TimetableEditFormStore.calendarId,
                tripDirection: TimetableEditFormStore.tripDirection,
                tripBlockId: TimetableEditFormStore.tripBlockId,
            },
            trips,
        );
    }

    clearDraft(): void {
        TimetableEditFormDraftStore.clearDraft();
    }

    /** 現在の閲覧コンテキストに一致する下書きがあれば返す（再訪時の復元提案に使う） */
    getMatchingDraft(): TimetableEditFormDraft | null {
        const draft = TimetableEditFormDraftStore.draft;
        const context = {
            mode: TimetableEditFormStore.mode,
            calendarId: TimetableEditFormStore.calendarId,
            tripDirection: TimetableEditFormStore.tripDirection,
            tripBlockId: TimetableEditFormStore.tripBlockId,
        };

        return draftMatchesContext(draft, context) ? draft : null;
    }
}
