import { APP_INITIALIZER, Provider } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { InitializeState } from 'src/app/global-states/initialize.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListStateStore } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenState } from 'src/app/global-states/token.state';

export const AppInitializerProvider: Provider = {
    provide: APP_INITIALIZER,
    useFactory:
        (
            tokenState: TokenState,
            agencyListStateStore: AgencyListState,
            calendarListStateStore: CalendarListState,
            routeStationListStateStore: RouteStationListState,
            serviceListStateStore: ServiceListState,
            todaysCalendarListStateStore: TodaysCalendarListStateStore,
            todaysOperationListStateStore: TodaysOperationListStateStore,
            todaysFormationListStateStore: TodaysFormationListStateStore,
            initializeState: InitializeState,
        ) =>
        async () => {
            await lastValueFrom(tokenState.fetch());

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

            initializeState.markInitialized();
        },
    deps: [
        TokenState,
        AgencyListState,
        CalendarListState,
        RouteStationListState,
        ServiceListState,
        TodaysCalendarListStateStore,
        TodaysOperationListStateStore,
        TodaysFormationListStateStore,
        InitializeState,
    ],
    multi: true,
};
