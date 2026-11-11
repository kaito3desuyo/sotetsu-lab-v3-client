import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TimetableFormationService } from './services/timetable-formation.service';

export const TIMETABLE_FORMATION_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-formation.component').then(
                (mod) => mod.TimetableFormationComponent,
            ),
        providers: [TimetableFormationService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '編成別時刻表',
            description:
                '相鉄線と直通先で、編成ごとにその日どの列車に入るかと各駅の時刻を調べられます。過去の日と明日の見込みも選べます。',
        },
    },
];
