import { Route } from '@angular/router';
import { OperationPastTimeResolverService } from './services/operation-past-time-resolver.service';
import { OperationPastTimeService } from './services/operation-past-time.service';
import {
    OperationPastTimeStateQuery,
    OperationPastTimeStateStore,
} from './states/operation-past-time.state';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';

export const OPERATION_PAST_TIME_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-past-time.component').then(
                (mod) => mod.OperationPastTimeComponent
            ),
        providers: [
            OperationPastTimeService,
            OperationPastTimeResolverService,
            OperationPastTimeStateStore,
            OperationPastTimeStateQuery,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: OperationPastTimeResolverService,
        },
        data: {
            title: '過去の運用情報',
        },
        runGuardsAndResolvers: 'always',
    },
];
