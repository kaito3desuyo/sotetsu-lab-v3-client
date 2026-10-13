import { provideHttpClient, withXhr } from '@angular/common/http';
import { TestBed, inject } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
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
                    provide: RouteStationListStateQuery,
                    useValue: { routeStations$: of([]) },
                },
            ],
        });
        DashboardStore.setTodaysCalendar({
            calendarId: 'cal-1',
        } as never);
        DashboardStore.setItineraryLinks([]);
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
        await expect(
            firstValueFrom(DashboardStore.itineraryLinks$),
        ).resolves.toEqual(links);
    });

    it('つながりが取れなくても本数は出す', async () => {
        findManyItineraryLinks.mockReturnValue(throwError(() => new Error()));
        const service = TestBed.inject(DashboardService);

        await expect(
            firstValueFrom(service.fetchRunningTripCount()),
        ).resolves.toBeUndefined();
    });
});
