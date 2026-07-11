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
        // N1 ダイヤグラム: D-10（35-architecture-new-pages.md §4）によりサイドナビの
        // トップレベルに置く。パス・物理配置ともユーザー指示（2026-07-07）で変更:
        // 仕様§98 の /diagram → /train-diagram、仕様§2 の pages/timetable/timetable-diagram/
        // → pages/train-diagram/（N2 の pages/train-location/ と対称にするため）。
        path: 'train-diagram',
        loadChildren: () =>
            import('./pages/train-diagram/train-diagram.route').then(
                (mod) => mod.TRAIN_DIAGRAM_ROUTES,
            ),
        canActivate: [maintenanceGuard],
        resolve: {
            from: initialDataResolver,
        },
        runGuardsAndResolvers: 'always',
    },
    {
        // N2 列車位置情報: D-10（35-architecture-new-pages.md §4）によりサイドナビの
        // トップレベルに置く。物理配置は pages/train-location/（N1 の pages/train-diagram/ と対称）。
        path: 'train-location',
        loadChildren: () =>
            import('./pages/train-location/train-location.route').then(
                (mod) => mod.TRAIN_LOCATION_ROUTES,
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
