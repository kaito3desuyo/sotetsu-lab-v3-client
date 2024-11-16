import { Routes } from '@angular/router';
import {
    maintenanceGuard,
    noMaintenanceGuard,
} from './core/guards/maintenance.guard';
import { initialDataResolver } from './core/resolvers/initial-data.resolver';

export const APP_ROUTES: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('./pages/dashboard/dashboard.route').then(
                (mod) => mod.DASHBOARD_ROUTES,
            ),
        canActivate: [maintenanceGuard],
        resolve: {
            from: initialDataResolver,
        },
        runGuardsAndResolvers: 'always',
    },
    {
        path: 'operation',
        loadChildren: () =>
            import('./pages/operation/operation.route').then(
                (mod) => mod.OPERATION_ROUTES,
            ),
        canActivate: [maintenanceGuard],
        resolve: {
            from: initialDataResolver,
        },
        runGuardsAndResolvers: 'always',
    },
    {
        path: 'timetable',
        loadChildren: () =>
            import('./pages/timetable/timetable.route').then(
                (mod) => mod.TIMETABLE_ROUTES,
            ),
        canActivate: [maintenanceGuard],
        resolve: {
            from: initialDataResolver,
        },
        runGuardsAndResolvers: 'always',
    },
    {
        path: 'library',
        loadChildren: () =>
            import('./pages/library/library.route').then(
                (mod) => mod.LIBRARY_ROUTES,
            ),
    },
    {
        path: 'maintenance',
        loadChildren: () =>
            import('./pages/maintenance/maintenance.route').then(
                (mod) => mod.MAINTENANCE_ROUTES,
            ),
        canActivate: [noMaintenanceGuard],
    },
];
