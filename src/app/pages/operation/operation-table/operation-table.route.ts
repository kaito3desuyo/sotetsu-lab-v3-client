import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';

export const OPERATION_TABLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-table.component').then(
                (mod) => mod.OperationTableComponent,
            ),
        providers: [OperationTableService, ...OPERATION_SEARCH_CARD_PROVIDERS],
        resolve: {
            from: pageResolver(OperationTableStore.persistInitialized$),
        },
        data: {
            title: '運用表',
        },
    },
];
