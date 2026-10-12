import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { TimetableAllLineService } from './services/timetable-all-line.service';

export const TIMETABLE_ALL_LINE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-all-line.component').then(
                (mod) => mod.TimetableAllLineComponent,
            ),
        providers: [
            TimetableAllLineService,
            ...TIMETABLE_SEARCH_CARD_PROVIDERS,
        ],
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: '全線時刻表',
        },
        runGuardsAndResolvers: 'always',
    },
];
