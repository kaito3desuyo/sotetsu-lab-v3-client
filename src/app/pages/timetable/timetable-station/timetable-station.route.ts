import { Routes } from '@angular/router';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { TimetableStationResolverService } from './services/timetable-station-resolver.service';
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
            TimetableStationResolverService,
            ...TIMETABLE_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: TimetableStationResolverService,
        },
        data: {
            title: '駅別時刻表',
        },
    },
];
