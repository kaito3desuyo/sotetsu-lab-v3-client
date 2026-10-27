import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import { MaintenanceState } from 'src/app/global-states/maintenance.state';

export const maintenanceGuard: CanActivateFn = async (route, state) => {
    // サーバーで描いた HTML は CDN に置くので、メンテ中かどうかは入れない。ブラウザで判定する
    if (isPlatformServer(inject(PLATFORM_ID))) {
        return true;
    }

    const router = inject(Router);
    const maintenanceState = inject(MaintenanceState);

    await lastValueFrom(
        maintenanceState.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
    );

    const isMaintenance = maintenanceState.isMaintenance();

    if (isMaintenance) {
        return router.parseUrl('/maintenance');
    } else {
        return true;
    }
};

export const noMaintenanceGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const maintenanceState = inject(MaintenanceState);

    await lastValueFrom(maintenanceState.fetch());

    const isMaintenance = maintenanceState.isMaintenance();

    if (!isMaintenance) {
        return router.parseUrl('/');
    } else {
        return true;
    }
};
