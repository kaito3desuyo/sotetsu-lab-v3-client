import { Route } from '@angular/router';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import TIMETABLE_POST_CARD_PROVIDERS from 'src/app/shared/timetable-post-card/timetable-post-card.provider';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { DashboardResolverService } from './services/dashboard-resolver.service';
import { DashboardService } from './services/dashboard.service';

export const DASHBOARD_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./dashboard.component').then(
                (mod) => mod.DashboardComponent,
            ),
        providers: [
            DashboardService,
            DashboardResolverService,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
            ...TIMETABLE_SEARCH_CARD_PROVIDERS,
            ...TIMETABLE_POST_CARD_PROVIDERS,
        ],
        resolve: {
            from: DashboardResolverService,
        },
        runGuardsAndResolvers: 'always',
    },
];
