import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationPastTimeService } from './services/operation-past-time.service';

export const OPERATION_PAST_TIME_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-past-time.component').then(
                (mod) => mod.OperationPastTimeComponent,
            ),
        providers: [
            OperationPastTimeService,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '過去の運用情報',
        },
    },
];
