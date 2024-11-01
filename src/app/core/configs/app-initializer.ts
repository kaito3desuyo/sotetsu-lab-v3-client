import { APP_INITIALIZER, Provider } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AgencyListStateStore } from 'src/app/global-states/agency-list.state';
import { CalendarListStateStore } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateStore } from 'src/app/global-states/route-station-list.state';
import { ServiceListStateStore } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListStateStore } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenStateStore } from 'src/app/global-states/token.state';

export const AppInitializerProvider: Provider = {
    provide: APP_INITIALIZER,
    useFactory:
        (
            tokenStateStore: TokenStateStore,
            agencyListStateStore: AgencyListStateStore,
            calendarListStateStore: CalendarListStateStore,
            routeStationListStateStore: RouteStationListStateStore,
            serviceListStateStore: ServiceListStateStore,
            todaysCalendarListStateStore: TodaysCalendarListStateStore,
            todaysOperationListStateStore: TodaysOperationListStateStore,
            todaysFormationListStateStore: TodaysFormationListStateStore,
        ) =>
        async () => {
            await lastValueFrom(tokenStateStore.fetch());

            await Promise.all([
                lastValueFrom(agencyListStateStore.fetch()),
                lastValueFrom(calendarListStateStore.fetch()),
                lastValueFrom(routeStationListStateStore.fetch()),
                lastValueFrom(serviceListStateStore.fetch()),
            ]);

            await lastValueFrom(todaysCalendarListStateStore.fetch());

            await Promise.all([
                lastValueFrom(todaysOperationListStateStore.fetch()),
                lastValueFrom(todaysFormationListStateStore.fetch()),
            ]);
        },
    deps: [
        TokenStateStore,
        AgencyListStateStore,
        CalendarListStateStore,
        RouteStationListStateStore,
        ServiceListStateStore,
        TodaysCalendarListStateStore,
        TodaysOperationListStateStore,
        TodaysFormationListStateStore,
    ],
    multi: true,
};
