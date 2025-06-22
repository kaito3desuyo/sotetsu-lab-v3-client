import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AgencyListStateStore } from 'src/app/global-states/agency-list.state';
import { CalendarListStateStore } from 'src/app/global-states/calendar-list.state';
import { InitializeStateStore } from 'src/app/global-states/initialize.state';
import { RouteStationListStateStore } from 'src/app/global-states/route-station-list.state';
import { ServiceListStateStore } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListStateStore } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenStateStore } from 'src/app/global-states/token.state';
import { UserStateStore } from 'src/app/global-states/user.state';

export const initialDataResolver: ResolveFn<boolean> = async (route, state) => {
    const tokenStateStore = inject(TokenStateStore);
    const userStateStore = inject(UserStateStore);
    const agencyListStateStore = inject(AgencyListStateStore);
    const calendarListStateStore = inject(CalendarListStateStore);
    const routeStationListStateStore = inject(RouteStationListStateStore);
    const serviceListStateStore = inject(ServiceListStateStore);
    const todaysCalendarListStateStore = inject(TodaysCalendarListStateStore);
    const todaysOperationListStateStore = inject(TodaysOperationListStateStore);
    const todaysFormationListStateStore = inject(TodaysFormationListStateStore);
    const initializeStateStore = inject(InitializeStateStore);

    await Promise.all([
        lastValueFrom(tokenStateStore.fetch()),
        lastValueFrom(userStateStore.fetch()),
    ]);

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

    initializeStateStore.markInitialized();

    return true;
};
