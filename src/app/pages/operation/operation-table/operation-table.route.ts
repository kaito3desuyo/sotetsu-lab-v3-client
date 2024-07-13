import { Route } from '@angular/router';
import { OperationTableResolverService } from './services/operation-table-resolver.service';
import { OperationTableService } from './services/operation-table.service';
import {
    OperationTableStateStore,
    OperationTableStateQuery,
} from './states/operation-table.state';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';

export const OPERATION_TABLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-table.component').then(
                (mod) => mod.OperationTableComponent
            ),
        providers: [
            OperationTableService,
            OperationTableResolverService,
            OperationTableStateStore,
            OperationTableStateQuery,
            ...OPERATION_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: OperationTableResolverService,
        },
        data: {
            title: '運用表',
        },
        runGuardsAndResolvers: 'always',
    },
];
