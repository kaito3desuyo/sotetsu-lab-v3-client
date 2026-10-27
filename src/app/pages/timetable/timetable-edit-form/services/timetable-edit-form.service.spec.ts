import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { ServiceListState } from 'src/app/global-states/service-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { ETimetableEditFormMode } from '../enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from '../stores/timetable-edit-form.store';
import { TimetableEditFormService } from './timetable-edit-form.service';

describe('TimetableEditFormService', () => {
    let service: TimetableEditFormService;
    let tripBlockService: {
        findOneById: jest.Mock;
        findManyByFilter: jest.Mock;
        createMany: jest.Mock;
        replaceOne: jest.Mock;
    };
    let operationService: { findManyByCalendarId: jest.Mock };
    let tripClassService: { findMany: jest.Mock };

    beforeEach(() => {
        tripBlockService = {
            findOneById: jest.fn(() =>
                of({ tripBlockId: 'block-1', trips: [] }),
            ),
            findManyByFilter: jest.fn(() => of([])),
            createMany: jest.fn(() => of([])),
            replaceOne: jest.fn(() => of({})),
        };
        operationService = { findManyByCalendarId: jest.fn(() => of([])) };
        tripClassService = { findMany: jest.fn(() => of([])) };

        TestBed.configureTestingModule({
            providers: [
                TimetableEditFormService,
                { provide: ServiceService, useValue: {} },
                { provide: CalendarService, useValue: {} },
                { provide: OperationService, useValue: operationService },
                { provide: TripClassService, useValue: tripClassService },
                { provide: TripBlockService, useValue: tripBlockService },
                {
                    provide: ServiceListState,
                    useValue: { serviceId: signal('service-1') },
                },
            ],
        });
        service = TestBed.inject(TimetableEditFormService);

        TimetableEditFormStore.setMode(ETimetableEditFormMode.COPY);
        TimetableEditFormStore.setCalendarId('calendar-1');
        TimetableEditFormStore.setTripDirection(ETripDirection.OUTBOUND);
        TimetableEditFormStore.setTripBlockId(null);
        TimetableEditFormStore.setTargetTripBlock(null);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('B8-3: selectCopySource はコピー元 trip-block を取得しストアへ反映する', (done) => {
        service.selectCopySource('block-1').subscribe(() => {
            expect(tripBlockService.findOneById).toHaveBeenCalledWith({
                id: 'block-1',
            });
            expect(TimetableEditFormStore.tripBlockId).toBe('block-1');
            done();
        });
    });

    describe('読み込んだ列車の通る路線を絞り込みに足す', () => {
        const station = (stationId: string, routeIds: string[]) => ({
            stationId,
            routeStationLists: routeIds.map((routeId) => ({ routeId })),
        });
        const block = {
            tripBlockId: 'block-1',
            trips: [
                {
                    times: [
                        { stationId: '湘南台' },
                        { stationId: '二俣川' },
                        { stationId: '横浜' },
                    ],
                },
            ],
        };

        beforeEach(() => {
            TimetableEditFormStore.setStations([
                station('湘南台', ['izumino']),
                station('二俣川', ['main', 'izumino']),
                station('横浜', ['main']),
                station('厚木', ['atsugi']),
            ] as any);
            TimetableEditFormStore.setSelectedRouteIds(['shinyoko']);
            tripBlockService.findOneById.mockReturnValue(of(block));
        });

        it('コピー元を選んだら、選択中の路線は外さずに足す', (done) => {
            service.selectCopySource('block-1').subscribe(() => {
                expect(
                    [...TimetableEditFormStore.selectedRouteIds].sort(),
                ).toEqual(['izumino', 'main', 'shinyoko']);
                done();
            });
        });

        it('更新する列車を読み込んだときも足す', (done) => {
            TimetableEditFormStore.setTripBlockId('block-1');
            service.fetchTargetTripBlock().subscribe(() => {
                expect(
                    [...TimetableEditFormStore.selectedRouteIds].sort(),
                ).toEqual(['izumino', 'main', 'shinyoko']);
                done();
            });
        });

    });

    it('候補は一覧に使う項目だけなので、ID で読んだコピー元を候補で上書きしない', (done) => {
        const target = { tripBlockId: 'block-1', trips: [{ times: [] }] };
        TimetableEditFormStore.setTripBlockId('block-1');
        TimetableEditFormStore.setTargetTripBlock(target as any);
        tripBlockService.findManyByFilter.mockReturnValue(
            of([{ tripBlockId: 'block-1', trips: [] }]),
        );

        service.fetchCopySourceCandidates().subscribe(async () => {
            expect(
                await firstValueFrom(TimetableEditFormStore.targetTripBlock$),
            ).toBe(target);
            done();
        });
    });

    it('selectCopySource(null) はコピー元選択を解除する', (done) => {
        service.selectCopySource(null).subscribe(() => {
            expect(tripBlockService.findOneById).not.toHaveBeenCalled();
            expect(TimetableEditFormStore.tripBlockId).toBeNull();
            done();
        });
    });

    it('fetchCopySourceCandidates は calendarId + tripDirection で、一覧に使う項目だけを取得する（全項目は Lambda の 6MB を超えて 502）', (done) => {
        service.fetchCopySourceCandidates().subscribe(() => {
            expect(tripBlockService.findManyByFilter).toHaveBeenCalledWith({
                calendarId: 'calendar-1',
                tripDirection: ETripDirection.OUTBOUND,
                fields: {
                    trip: ['tripNumber', 'tripClassId'],
                    time: [
                        'stationId',
                        'stopSequence',
                        'arrivalTime',
                        'departureTime',
                    ],
                },
            });
            done();
        });
    });

    it('編集する列車の ID が無ければ、PUT /trip-blocks/null を送らずに失敗させる', (done) => {
        TimetableEditFormStore.setTripBlockId(null);

        service.replaceTripBlock([]).subscribe({
            error: (e: Error) => {
                expect(tripBlockService.replaceOne).not.toHaveBeenCalled();
                expect(e.message).toBe('編集する列車が決まっていません');
                done();
            },
        });
    });

    it('向きが決まっていなければ、候補を取りに行かず空にする（tripDirection=null で 422 になるため）', (done) => {
        TimetableEditFormStore.resetForNewSession();
        TimetableEditFormStore.setCalendarId('calendar-1');
        TimetableEditFormStore.setCopySourceCandidates([
            { tripBlockId: 'stale' },
        ] as TripBlockDetailsDto[]);

        service.fetchCopySourceCandidates().subscribe(async () => {
            expect(tripBlockService.findManyByFilter).not.toHaveBeenCalled();
            expect(
                await firstValueFrom(
                    TimetableEditFormStore.copySourceCandidates$,
                ),
            ).toEqual([]);
            done();
        });
    });

    it('fetchOperations はリアルタイム運用と同じ順（数字 → G → K）に並べ、100 を除く', (done) => {
        operationService.findManyByCalendarId.mockReturnValue(
            of(
                ['10K', '100', '51', '10G', '9', '10'].map(
                    (operationNumber) => ({ operationNumber }),
                ),
            ),
        );
        const setOperations = jest.spyOn(
            TimetableEditFormStore,
            'setOperations',
        );
        service.fetchOperations().subscribe(() => {
            expect(
                setOperations.mock.calls[0][0].map((o) => o.operationNumber),
            ).toEqual(['9', '10', '51', '10G', '10K']);
            setOperations.mockRestore();
            done();
        });
    });

    it('fetchTripClasses は種別を sequence の順に並べ、sequence の無い種別は最後にする', (done) => {
        tripClassService.findMany.mockReturnValue(
            of([
                { tripClassName: '回送' },
                { tripClassName: '各停', sequence: 3 },
                { tripClassName: '特急', sequence: 1 },
                { tripClassName: '快速', sequence: 2 },
            ]),
        );
        const setTripClasses = jest.spyOn(
            TimetableEditFormStore,
            'setTripClasses',
        );
        service.fetchTripClasses().subscribe(() => {
            expect(
                setTripClasses.mock.calls[0][0].map((c) => c.tripClassName),
            ).toEqual(['特急', '快速', '各停', '回送']);
            setTripClasses.mockRestore();
            done();
        });
    });

    it('下書き: getMatchingDraft はコンテキスト不一致なら null を返す', () => {
        expect(service.getMatchingDraft()).toBeNull();
    });

    it('下書き: saveDraft → getMatchingDraft で往復できる', () => {
        service.saveDraft([{ tripNumber: '123' }]);
        const draft = service.getMatchingDraft();
        expect(draft).not.toBeNull();
        expect(draft?.trips).toEqual([{ tripNumber: '123' }]);
        service.clearDraft();
        expect(service.getMatchingDraft()).toBeNull();
    });
});
