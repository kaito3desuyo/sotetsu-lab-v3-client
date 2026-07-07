import { Route } from '@angular/router';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationPastTimeResolverService } from './services/operation-past-time-resolver.service';
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
            OperationPastTimeResolverService,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: OperationPastTimeResolverService,
        },
        data: {
            title: '過去の運用情報',
        },
    },
];
