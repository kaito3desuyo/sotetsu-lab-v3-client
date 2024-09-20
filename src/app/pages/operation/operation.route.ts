import { Routes } from '@angular/router';

export const OPERATION_ROUTES: Routes = [
    {
        path: 'real-time',
        loadChildren: () =>
            import('./operation-real-time/operation-real-time.route').then(
                (mod) => mod.OPERATION_REAL_TIME_ROUTES,
            ),
    },
    {
        path: 'past-time',
        loadChildren: () =>
            import('./operation-past-time/operation-past-time.route').then(
                (mod) => mod.OPERATION_PAST_TIME_ROUTES,
            ),
    },
    {
        path: 'table',
        loadChildren: () =>
            import('./operation-table/operation-table.route').then(
                (mod) => mod.OPERATION_TABLE_ROUTES,
            ),
    },
    {
        path: 'route-diagram',
        loadChildren: () =>
            import(
                './operation-route-diagram/operation-route-diagram.route'
            ).then((mod) => mod.OPERATION_ROUTE_DIAGRAM_ROUTES),
    },
];
