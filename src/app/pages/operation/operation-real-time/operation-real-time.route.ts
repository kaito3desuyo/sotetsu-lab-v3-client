import { Route } from '@angular/router';
import { OperationRealTimeResolverService } from './services/operation-real-time-resolver.service';
import { OperationRealTimeService } from './services/operation-real-time.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from './states/operation-real-time.state';

export const OPERATION_REAL_TIME_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-real-time.component').then(
                (mod) => mod.OperationRealTimeComponent,
            ),
        providers: [
            OperationRealTimeService,
            OperationRealTimeResolverService,
            OperationRealTimeStateStore,
            OperationRealTimeStateQuery,
        ],
        resolve: {
            from: OperationRealTimeResolverService,
        },
        data: {
            title: 'リアルタイム運用情報',
        },
        runGuardsAndResolvers: 'always',
    },
];
