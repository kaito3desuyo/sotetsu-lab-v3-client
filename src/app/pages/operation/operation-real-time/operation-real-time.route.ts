import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeStore } from './stores/operation-real-time.store';

export const OPERATION_REAL_TIME_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-real-time.component').then(
                (mod) => mod.OperationRealTimeComponent,
            ),
        providers: [OperationRealTimeService],
        resolve: {
            from: pageResolver(OperationRealTimeStore.persistInitialized$),
        },
        data: {
            title: 'リアルタイム運用情報',
        },
        runGuardsAndResolvers: 'always',
    },
];
