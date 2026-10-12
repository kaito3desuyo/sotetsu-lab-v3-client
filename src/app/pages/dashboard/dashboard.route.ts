import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import TIMETABLE_POST_CARD_PROVIDERS from 'src/app/shared/timetable-post-card/timetable-post-card.provider';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { DashboardService } from './services/dashboard.service';
import { DashboardStore } from './stores/dashboard.store';

export const DASHBOARD_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./dashboard.component').then(
                (mod) => mod.DashboardComponent,
            ),
        providers: [
            DashboardService,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
            ...TIMETABLE_SEARCH_CARD_PROVIDERS,
            ...TIMETABLE_POST_CARD_PROVIDERS,
        ],
        resolve: {
            from: pageResolver(DashboardStore.persistInitialized$),
        },
        runGuardsAndResolvers: 'always',
    },
];
