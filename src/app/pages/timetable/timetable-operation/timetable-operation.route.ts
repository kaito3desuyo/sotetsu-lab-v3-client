import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TimetableOperationService } from './services/timetable-operation.service';

export const TIMETABLE_OPERATION_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-operation.component').then(
                (mod) => mod.TimetableOperationComponent,
            ),
        providers: [TimetableOperationService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '運用別時刻表',
            description:
                '相鉄線と直通先で、運用ごとにその日の列車の並びと各駅の時刻、走った編成を調べられます。',
        },
    },
];
