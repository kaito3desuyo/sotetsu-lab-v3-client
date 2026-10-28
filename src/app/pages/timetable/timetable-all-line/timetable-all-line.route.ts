import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TimetableAllLineService } from './services/timetable-all-line.service';

export const TIMETABLE_ALL_LINE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-all-line.component').then(
                (mod) => mod.TimetableAllLineComponent,
            ),
        providers: [TimetableAllLineService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '全線時刻表',
            description:
                '相鉄線と直通先の全線時刻表。ダイヤ・方向ごとに、全列車の各駅の時刻を並べます。',
        },
        runGuardsAndResolvers: 'always',
    },
];
