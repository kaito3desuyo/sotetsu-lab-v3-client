import { APP_INITIALIZER, Provider } from '@angular/core';
import { AgencyListStateStore } from 'src/app/global-states/agency-list.state';
import { CalendarListStateStore } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateStore } from 'src/app/global-states/route-station-list.state';
import { ServiceListStateStore } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenStateStore } from 'src/app/global-states/token.state';

export const AppInitializerProvider: Provider = {
    provide: APP_INITIALIZER,
    useFactory:
        (
            agencyListStateStore: AgencyListStateStore,
            calendarListStateStore: CalendarListStateStore,
            routeStationListStateStore: RouteStationListStateStore,
            serviceListStateStore: ServiceListStateStore,
            todaysCalendarListStateStore: TodaysCalendarListStateStore,
            todaysOperationListStateStore: TodaysOperationListStateStore
        ) =>
        async () => {
            await Promise.all([
                agencyListStateStore.fetch().toPromise(),
                calendarListStateStore.fetch().toPromise(),
                routeStationListStateStore.fetch().toPromise(),
                serviceListStateStore.fetch().toPromise(),
            ]);

            await todaysCalendarListStateStore.fetch().toPromise();
            await todaysOperationListStateStore.fetch().toPromise();
        },
    deps: [
        AgencyListStateStore,
        CalendarListStateStore,
        RouteStationListStateStore,
        ServiceListStateStore,
        TodaysCalendarListStateStore,
        TodaysOperationListStateStore,
    ],
    multi: true,
};
