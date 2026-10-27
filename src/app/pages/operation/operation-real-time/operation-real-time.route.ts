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
            from: pageResolver(OperationRealTimeStore),
        },
        data: {
            title: 'リアルタイム運用情報',
            description:
                '相鉄線の運用ごとに、いまどの編成が走っているかを目撃情報から一覧にします。',
        },
        runGuardsAndResolvers: 'always',
    },
];
