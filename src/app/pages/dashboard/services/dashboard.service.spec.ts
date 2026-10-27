import { signal } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { TestBed, inject } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { DashboardStore } from '../stores/dashboard.store';
import { DashboardService } from './dashboard.service';

describe('Service: Dashboard', () => {
    const findManyItineraryLinks = jest.fn();

    beforeEach(() => {
        findManyItineraryLinks.mockReset();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
                DashboardService,
                {
                    provide: OperationService,
                    useValue: { findManyItineraryLinks },
                },
                {
                    provide: TripBlockService,
                    useValue: {
                        findManyByCalendarId: () => of({ 0: [], 1: [] }),
                    },
                },
                {
                    provide: RouteStationListState,
                    useValue: { routeStations: signal([]) },
                },
            ],
        });
        const store = TestBed.inject(DashboardStore);
        store.setTodaysCalendar({
            calendarId: 'cal-1',
        } as never);
        store.setItineraryLinks([]);
    });

    it('should ...', inject([DashboardService], (service: DashboardService) => {
        expect(service).toBeTruthy();
    }));

    it('走行本数の算出に運用のつながりを渡して取る', async () => {
        const links = [{ tripOperationListId: 't' }];
        findManyItineraryLinks.mockReturnValue(of(links));
        const service = TestBed.inject(DashboardService);

        await firstValueFrom(service.fetchRunningTripCount());

        expect(findManyItineraryLinks).toHaveBeenCalledWith({
            calendarId: 'cal-1',
        });
        expect(TestBed.inject(DashboardStore).itineraryLinks()).toEqual(links);
    });

    it('つながりが取れなくても本数は出す', async () => {
        findManyItineraryLinks.mockReturnValue(throwError(() => new Error()));
        const service = TestBed.inject(DashboardService);

        await expect(
            firstValueFrom(service.fetchRunningTripCount()),
        ).resolves.toBeUndefined();
    });
});
