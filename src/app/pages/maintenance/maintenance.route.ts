import { Route } from '@angular/router';

export const MAINTENANCE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./maintenance.component').then(
                (mod) => mod.MaintenanceComponent,
            ),
    },
];
