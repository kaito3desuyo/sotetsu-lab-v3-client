import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
    MaintenanceStateQuery,
    MaintenanceStateStore,
} from 'src/app/global-states/maintenance.state';

export const maintenanceGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const maintenanceStateStore = inject(MaintenanceStateStore);
    const maintenanceStateQuery = inject(MaintenanceStateQuery);

    await lastValueFrom(maintenanceStateStore.fetch());

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
