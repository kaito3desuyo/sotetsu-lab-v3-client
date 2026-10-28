import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';

export const TIMETABLE_STATION_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-station.component').then(
                (mod) => mod.TimetableStationComponent,
            ),
        providers: [TimetableStationService],
        resolve: {
            from: pageResolver(TimetableStationStore),
        },
        data: {
            title: '駅別時刻表',
            description:
                '相鉄線と直通先の駅別時刻表。ダイヤ・方向ごとに、列車の種別・行先・運用番号を載せます。',
        },
    },
];
