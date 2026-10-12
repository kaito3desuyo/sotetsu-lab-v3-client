import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';

export const OPERATION_TABLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-table.component').then(
                (mod) => mod.OperationTableComponent,
            ),
        providers: [OperationTableService],
        resolve: {
            from: pageResolver(OperationTableStore.persistInitialized$),
        },
        data: {
            title: '運用表',
        },
    },
];
