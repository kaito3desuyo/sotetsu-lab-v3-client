import { APP_INITIALIZER, Provider } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { InitializeState } from 'src/app/global-states/initialize.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListState } from 'src/app/global-states/todays-operation-list.state';
import { TokenState } from 'src/app/global-states/token.state';

export const AppInitializerProvider: Provider = {
    provide: APP_INITIALIZER,
    useFactory:
        (
            tokenState: TokenState,
            agencyListState: AgencyListState,
            calendarListState: CalendarListState,
            routeStationListState: RouteStationListState,
            serviceListState: ServiceListState,
            todaysCalendarListState: TodaysCalendarListState,
            todaysOperationListState: TodaysOperationListState,
            todaysFormationListState: TodaysFormationListState,
            initializeState: InitializeState,
        ) =>
        async () => {
            await lastValueFrom(tokenState.fetch());

            await Promise.all([
                lastValueFrom(agencyListState.fetch()),
                lastValueFrom(calendarListState.fetch()),
                lastValueFrom(routeStationListState.fetch()),
                lastValueFrom(serviceListState.fetch()),
            ]);

            await lastValueFrom(todaysCalendarListState.fetch());

            await Promise.all([
                lastValueFrom(todaysOperationListState.fetch()),
                lastValueFrom(todaysFormationListState.fetch()),
            ]);

            initializeState.markInitialized();
        },
    deps: [
        TokenState,
        AgencyListState,
        CalendarListState,
        RouteStationListState,
        ServiceListState,
        TodaysCalendarListState,
        TodaysOperationListState,
        TodaysFormationListState,
        InitializeState,
    ],
    multi: true,
};
