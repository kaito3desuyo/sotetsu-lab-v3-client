import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TimetableStationService } from './services/timetable-station.service';

export const TIMETABLE_STATION_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-station.component').then(
                (mod) => mod.TimetableStationComponent,
            ),
        providers: [TimetableStationService],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '駅別時刻表',
        },
    },
];
