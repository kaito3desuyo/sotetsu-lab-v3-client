import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { TimetableStationService } from './services/timetable-station.service';

export const TIMETABLE_STATION_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-station.component').then(
                (mod) => mod.TimetableStationComponent,
            ),
        providers: [
            TimetableStationService,
            ...TIMETABLE_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '駅別時刻表',
        },
    },
];
