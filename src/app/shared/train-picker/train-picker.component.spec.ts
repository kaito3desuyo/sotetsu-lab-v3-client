import '@testing-library/jest-dom';
import { PLATFORM_ID, Provider, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { Observable, of, throwError } from 'rxjs';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysListsRefresher } from 'src/app/global-states/todays-lists-refresher';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { PickableTrain } from './pickable-train.interface';
import { TrainPickerComponent } from './train-picker.component';
import { TrainPickerStore } from './train-picker.store';

const TRAIN: PickableTrain = {
    tripId: 't1',
    direction: 'inbound',
    time: new Date(),
    displayTime: '7:12',
    isArrivalOnly: false,
    isPast: false,
    tripNumber: '101K',
    tripClassName: '各停',
    tripClassColor: '#123456',
    destinationName: '横浜',
    operationNumber: '1001',
    operationId: 'op1',
};

jest.mock('./build-pickable-trains.util', () => ({
    buildPickableTrains: jest.fn(),
}));
import { buildPickableTrains } from './build-pickable-trains.util';

describe('TrainPickerComponent', () => {
    let fixture: ComponentFixture<TrainPickerComponent>;
    let findMany: jest.Mock<Observable<unknown>>;
    let calendarIdSignal: WritableSignal<string | null>;
    const blocks = [{ trips: [] }] as unknown as TripBlockDetailsDto[];

    const setup = (
        calendarId: string | null = 'cal-1',
        extraProviders: Provider[] = [],
    ) => {
        calendarIdSignal = signal(calendarId);
        TestBed.configureTestingModule({
            imports: [TrainPickerComponent, NoopAnimationsModule],
            providers: [
                ...extraProviders,
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'browser' },
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: jest.fn().mockResolvedValue(null),
                        setItem: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListState,
                    useValue: {
                        todaysCalendarId: calendarIdSignal,
                        isForToday: () => true,
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: { routeStations: signal([]) },
                },
                {
                    provide: AgencyListState,
                    useValue: { agencies: signal([]) },
                },
                {
                    provide: TripBlockService,
                    useValue: { findManyByCalendarId: findMany },
                },
                {
                    provide: TripClassService,
                    useValue: { findMany: () => of([]) },
                },
            ],
        });
        const store = TestBed.inject(TrainPickerStore);
        fixture = TestBed.createComponent(TrainPickerComponent);
        return store;
    };

    beforeEach(() => {
        findMany = jest.fn(() => of({ 0: blocks, 1: blocks }));
        (buildPickableTrains as jest.Mock).mockReset();
        (buildPickableTrains as jest.Mock).mockReturnValue([TRAIN]);
    });

    it('駅が未選択なら案内文が出て、一覧は無い', async () => {
        setup();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(
            /いる駅を選んでください/,
        );
        expect(
            fixture.nativeElement.querySelector('[data-train-row]'),
        ).toBeNull();
    });

    it('行を押すと picked がその列車で出る', async () => {
        const store = setup();
        patchState(unprotected(store), { stationId: 'st-1' });
        const picked = jest.fn();
        fixture.componentInstance.picked.subscribe(picked);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const row: HTMLButtonElement =
            fixture.nativeElement.querySelector('[data-train-row]');
        expect(row).toHaveTextContent(/7:12/);
        expect(row).toHaveTextContent(/101K/);
        expect(row).toHaveTextContent(/横浜/);
        expect(row).toHaveTextContent(/1001/);
        row.click();

        expect(picked).toHaveBeenCalledWith(TRAIN);
    });

    it('戻るで cancelled が出る', async () => {
        setup();
        const cancelled = jest.fn();
        fixture.componentInstance.cancelled.subscribe(cancelled);
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.nativeElement.querySelector('[data-back]').click();

        expect(cancelled).toHaveBeenCalled();
    });

    it('取得に失敗したら読み込めない旨と再読み込みボタンが出て、押すと取り直す', async () => {
        findMany.mockReturnValueOnce(throwError(() => new Error('x')));
        const store = setup();
        patchState(unprotected(store), { stationId: 'st-1' });
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(
            /列車を読み込めませんでした/,
        );
        fixture.nativeElement.querySelector('[data-reload] button').click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(findMany).toHaveBeenCalledTimes(2);
        expect(fixture.nativeElement).not.toHaveTextContent(
            /列車を読み込めませんでした/,
        );
    });

    it('該当 0 本なら、その旨ともっと前・もっと後を出す', async () => {
        (buildPickableTrains as jest.Mock).mockReturnValue([]);
        const store = setup();
        patchState(unprotected(store), { stationId: 'st-1' });
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(
            /この時間帯に選べる列車がありません/,
        );
        fixture.nativeElement.querySelector('[data-widen-before]').click();
        expect(store.minutesBefore()).toBe(20);
    });

    it('今日のダイヤが無ければ取得失敗として扱う', async () => {
        setup(null);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(
            /列車を読み込めませんでした/,
        );
    });

    it('一覧が古ければ引き直してから、その今日のダイヤの ID で列車を取る', async () => {
        const refreshIfStale = jest.fn(async () => {
            calendarIdSignal.set('cal-new');
            return true;
        });
        setup('cal-old', [
            {
                provide: TodaysListsRefresher,
                useValue: { isStale: () => true, refreshIfStale },
            },
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(refreshIfStale).toHaveBeenCalled();
        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({ calendarId: 'cal-new' }),
        );
    });
});
