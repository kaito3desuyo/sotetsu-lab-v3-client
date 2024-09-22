import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('./pages/dashboard/dashboard.route').then(
                (mod) => mod.DASHBOARD_ROUTES,
            ),
    },
    {
        path: 'operation',
        loadChildren: () =>
            import('./pages/operation/operation.route').then(
                (mod) => mod.OPERATION_ROUTES,
            ),
    },
    {
        path: 'timetable',
        loadChildren: () =>
            import('./pages/timetable/timetable.route').then(
                (mod) => mod.TIMETABLE_ROUTES,
            ),
    },
    {
        path: 'library',
        loadChildren: () =>
            import('./pages/library/library.route').then(
                (mod) => mod.LIBRARY_ROUTES,
            ),
    },
];
