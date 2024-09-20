import { Routes } from '@angular/router';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { TimetableAllLineResolverService } from './services/timetable-all-line-resolver.service';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from './states/timetable-all-line.state';

export const TIMETABLE_ALL_LINE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-all-line.component').then(
                (mod) => mod.TimetableAllLineComponent,
            ),
        providers: [
            TimetableAllLineService,
            TimetableAllLineResolverService,
            TimetableAllLineStateStore,
            TimetableAllLineStateQuery,
            ...TIMETABLE_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: TimetableAllLineResolverService,
        },
        data: {
            title: '全線時刻表',
        },
        runGuardsAndResolvers: 'always',
    },
];
