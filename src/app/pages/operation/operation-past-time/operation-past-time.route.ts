import { Route } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { OperationPastTimeService } from './services/operation-past-time.service';

export const OPERATION_PAST_TIME_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-past-time.component').then(
                (mod) => mod.OperationPastTimeComponent,
            ),
        providers: [OperationPastTimeService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '過去の運用情報',
            description:
                '相鉄線の過去の運用目撃情報を、日付ごと・編成ごとに一覧にします。',
        },
    },
];
