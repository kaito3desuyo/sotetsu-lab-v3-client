import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed, inject } from '@angular/core/testing';
import { Subject, lastValueFrom, of, throwError } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { SKIP_TRANSFER_CACHE } from 'src/app/core/ssr/skip-transfer-cache';
import { DeviceStorage } from 'src/app/core/storage/device-storage';

import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationTableStore } from '../stores/operation-table.store';
import { OperationTableService } from './operation-table.service';

describe('Service: OperationTable', () => {
    const operationService = {
        findManyWithTrips: jest.fn(),
        findOneWithTrips: jest.fn(),
    };

    const calendarService = { findOne: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                OperationTableService,
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
                { provide: CalendarService, useValue: calendarService },
                { provide: OperationService, useValue: operationService },
                { provide: TripClassService, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [OperationTableService],
        (service: OperationTableService) => {
            expect(service).toBeTruthy();
        },
    ));

    it('ダイヤ内の全運用を 1 回で取り、休車（運用番号 100）を除いてストアへ入れる', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            const operationTrips = ['11', '100', '91G'].map(
                (operationNumber) =>
                    ({
                        operation: { operationNumber },
                        trips: [],
                    }) as unknown as OperationTripsDto,
            );
            operationService.findManyWithTrips.mockReturnValue(
                of(operationTrips),
            );
            TestBed.inject(OperationTableStore).setCalendarId('cal-1');

            await lastValueFrom(service.fetchOperationTrips());

            expect(operationService.findManyWithTrips).toHaveBeenCalledWith({
                calendarId: 'cal-1',
            });
            // 運用ごとの取得（旧方式の N+1）はしない
            expect(operationService.findOneWithTrips).not.toHaveBeenCalled();
            expect(
                TestBed.inject(OperationTableStore)
                    .operationTrips()
                    .map(({ operation }) => operation.operationNumber),
            ).toEqual(['11', '91G']);
        },
    ));

    it('ダイヤ未選択では取りにいかない', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            TestBed.inject(OperationTableStore).setCalendarId(null);

            await lastValueFrom(service.fetchOperationTrips(), {
                defaultValue: undefined,
            });

            expect(operationService.findManyWithTrips).not.toHaveBeenCalled();
        },
    ));

    // api は無い ID に 404 でなく 200 と空の本文（null）を返す
    it('ダイヤ: 取れたら true、api が null を返したら false（ストアは null にする）', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            TestBed.inject(OperationTableStore).setCalendarId('cal-1');

            calendarService.findOne.mockReturnValue(
                of({ calendarId: 'cal-1' }),
            );
            expect(await lastValueFrom(service.fetchCalendar())).toBe(true);

            calendarService.findOne.mockReturnValue(of(null));
            expect(await lastValueFrom(service.fetchCalendar())).toBe(false);
            expect(TestBed.inject(OperationTableStore).calendar()).toBeNull();
        },
    ));

    it('ダイヤ: 失敗（5xx・通信の失敗）はエラーのまま流す', inject(
        [OperationTableService],
        async (service: OperationTableService) => {
            TestBed.inject(OperationTableStore).setCalendarId('cal-1');
            calendarService.findOne.mockReturnValue(
                throwError(() => new Error('500')),
            );

            await expect(
                lastValueFrom(service.fetchCalendar()),
            ).rejects.toThrow('500');
        },
    ));
});

describe('Service: OperationTable のサーバーからの受け渡し', () => {
    const KEY = makeStateKey<unknown>('operation-table-trips');

    const operationTrip = (operationNumber: string): OperationTripsDto =>
        ({
            operation: {
                operationId: `op-${operationNumber}`,
                operationNumber,
            },
            trips: [
                {
                    tripOperationListId: `tol-${operationNumber}`,
                    trip: {
                        tripId: `t-${operationNumber}`,
                        tripDirection: 0,
                        depotIn: false,
                        depotOut: false,
                        times: [{ timeId: 'x' }],
                    },
                },
            ],
        }) as unknown as OperationTripsDto;
    const full = () =>
        ['91', '11', '100', '12', '13', '14', '21', '22'].map(operationTrip);

    const setup = (params: {
        platform: 'server' | 'browser';
        findManyWithTrips?: jest.Mock;
        requestCache?: RequestCache;
    }) => {
        const findManyWithTrips =
            params.findManyWithTrips ?? jest.fn(() => of(full()));
        TestBed.configureTestingModule({
            providers: [
                OperationTableService,
                { provide: PLATFORM_ID, useValue: params.platform },
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
                { provide: CalendarService, useValue: {} },
                { provide: OperationService, useValue: { findManyWithTrips } },
                { provide: TripClassService, useValue: {} },
                {
                    provide: QueryInvalidator,
                    useValue: {
                        invalidated$: new Subject(),
                        requestCache: () => params.requestCache ?? 'default',
                    },
                },
            ],
        });
        const store = TestBed.inject(OperationTableStore);
        store.setCalendarId('cal-1');
        return {
            service: TestBed.inject(OperationTableService),
            store,
            transferState: TestBed.inject(TransferState),
            findManyWithTrips,
        };
    };

    type Payload = {
        calendarId: string;
        operationTrips: OperationTripsDto[];
    };
    const payload = (calendarId = 'cal-1'): Payload => ({
        calendarId,
        operationTrips: ['11', '12'].map(operationTrip),
    });

    it('サーバーは全量を取ってストアに入れ、5 枚目からを削った配列を鍵に積む（全量の応答は引き継がない）', async () => {
        const { service, store, transferState, findManyWithTrips } = setup({
            platform: 'server',
        });

        await lastValueFrom(service.fetchOperationTrips());

        const call = findManyWithTrips.mock.calls[0] as unknown as [
            { context: { get: (t: unknown) => boolean } },
        ];
        expect(call[0].context.get(SKIP_TRANSFER_CACHE)).toBe(true);
        expect(store.operationTrips()).toHaveLength(7);
        expect(store.isPartial()).toBe(false);
        const sent = transferState.get(KEY, null) as Payload;
        expect(sent.calendarId).toBe('cal-1');
        expect(
            sent.operationTrips.map((o) => o.operation.operationNumber),
        ).toEqual(['11', '12', '13', '14', '21', '22', '91']);
        // 先頭 4 枚は全量、5 枚目からは 5 項目だけ
        expect(sent.operationTrips[3].trips[0].trip?.times).toBeDefined();
        expect(sent.operationTrips[4].trips[0].trip?.times).toBeUndefined();
        expect(sent.operationTrips[6].trips[0].trip?.tripId).toBe('t-91');
    });

    it('ブラウザは暦が合えば HTTP を出さずに削った配列で埋め、isPartial を立てて鍵を消す', async () => {
        const { service, store, transferState, findManyWithTrips } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchOperationTrips(), {
            defaultValue: undefined,
        });

        expect(findManyWithTrips).not.toHaveBeenCalled();
        expect(store.isPartial()).toBe(true);
        expect(service.usedTransferredTrips()).toBe(true);
        expect(store.operationTrips()).toEqual(payload().operationTrips);
        expect(transferState.hasKey(KEY)).toBe(false);
    });

    it('暦が合わなければ鍵を捨てて全量を取る', async () => {
        const { service, store, transferState, findManyWithTrips } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload('cal-other'));

        await lastValueFrom(service.fetchOperationTrips());

        expect(findManyWithTrips).toHaveBeenCalledTimes(1);
        expect(store.isPartial()).toBe(false);
        expect(service.usedTransferredTrips()).toBe(false);
        expect(store.operationTrips()).toHaveLength(7);
        expect(transferState.hasKey(KEY)).toBe(false);
    });

    it('書き込みの後 1 時間（cache: reload）は鍵を使わず全量を取る', async () => {
        const { service, store, transferState, findManyWithTrips } = setup({
            platform: 'browser',
            requestCache: 'reload',
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchOperationTrips());

        expect(findManyWithTrips).toHaveBeenCalledTimes(1);
        expect(store.isPartial()).toBe(false);
        expect(transferState.hasKey(KEY)).toBe(false);
    });

    it('削った配列を使ったあとの取り直しで全量に入れ替わり、isPartial が戻る', async () => {
        const { service, store, transferState } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());
        await lastValueFrom(service.fetchOperationTrips(), {
            defaultValue: undefined,
        });

        await lastValueFrom(service.fetchOperationTrips());

        expect(store.isPartial()).toBe(false);
        expect(service.usedTransferredTrips()).toBe(false);
        expect(store.operationTrips()).toHaveLength(7);
    });

    it('削った配列を QueryCache に入れない（鍵を使っても OperationService は呼ばれない）', async () => {
        const { service, transferState, findManyWithTrips } = setup({
            platform: 'browser',
        });
        transferState.set(KEY, payload());

        await lastValueFrom(service.fetchOperationTrips(), {
            defaultValue: undefined,
        });

        expect(findManyWithTrips).not.toHaveBeenCalled();
    });

    it('取り直しの間にダイヤが替わったら、古いダイヤの中身で上書きしない', async () => {
        const response$ = new Subject<OperationTripsDto[]>();
        const { service, store } = setup({
            platform: 'browser',
            findManyWithTrips: jest.fn(() => response$),
        });
        const done = lastValueFrom(service.fetchOperationTrips());

        store.setCalendarId('cal-2');
        response$.next(full());
        response$.complete();
        await done;

        expect(store.operationTrips()).toEqual([]);
    });
});
