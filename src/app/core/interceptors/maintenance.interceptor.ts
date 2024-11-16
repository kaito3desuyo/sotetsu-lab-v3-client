import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { mergeMap, of, throwError } from 'rxjs';
import {
    MaintenanceStateQuery,
    MaintenanceStateStore,
} from 'src/app/global-states/maintenance.state';

export const maintenanceInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const maintenanceStateStore = inject(MaintenanceStateStore);
    const maintenanceStateQuery = inject(MaintenanceStateQuery);

    return of(undefined).pipe(
        mergeMap(() => maintenanceStateStore.fetch()),
        mergeMap(() => {
            const isMaintenance = maintenanceStateQuery.isMaintenance;

            if (isMaintenance) {
                router.parseUrl('/maintenance');
                return throwError(() => new Error('Under maintenance.'));
            } else {
                return next(req);
            }
        }),
    );
};
