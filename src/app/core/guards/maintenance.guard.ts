import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import {
    MaintenanceStateQuery,
    MaintenanceStateStore,
} from 'src/app/global-states/maintenance.state';

export const maintenanceGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const maintenanceStateStore = inject(MaintenanceStateStore);
    const maintenanceStateQuery = inject(MaintenanceStateQuery);

    await lastValueFrom(
        maintenanceStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
    );

    const isMaintenance = maintenanceStateQuery.isMaintenance;

    if (isMaintenance) {
        return router.parseUrl('/maintenance');
    } else {
        return true;
    }
};

export const noMaintenanceGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const maintenanceStateStore = inject(MaintenanceStateStore);
    const maintenanceStateQuery = inject(MaintenanceStateQuery);

    await lastValueFrom(maintenanceStateStore.fetch());

    const isMaintenance = maintenanceStateQuery.isMaintenance;

    if (!isMaintenance) {
        return router.parseUrl('/');
    } else {
        return true;
    }
};
