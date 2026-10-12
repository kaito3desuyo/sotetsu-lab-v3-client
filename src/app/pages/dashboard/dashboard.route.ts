import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { DashboardService } from './services/dashboard.service';
import { DashboardStore } from './stores/dashboard.store';

export const DASHBOARD_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./dashboard.component').then(
                (mod) => mod.DashboardComponent,
            ),
        providers: [DashboardService],
        resolve: {
            from: pageResolver(DashboardStore.persistInitialized$),
        },
        runGuardsAndResolvers: 'always',
    },
];
