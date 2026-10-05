import { Route } from '@angular/router';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationTableResolverService } from './services/operation-table-resolver.service';
import { OperationTableService } from './services/operation-table.service';

export const OPERATION_TABLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-table.component').then(
                (mod) => mod.OperationTableComponent,
            ),
        providers: [
            OperationTableService,
            OperationTableResolverService,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: OperationTableResolverService,
        },
        data: {
            title: '運用表',
        },
    },
];
