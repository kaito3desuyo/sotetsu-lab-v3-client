import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';

export const TIMETABLE_ALL_LINE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-all-line.component').then(
                (mod) => mod.TimetableAllLineComponent,
            ),
        providers: [TimetableAllLineService],
        resolve: {
            from: pageResolver(TimetableAllLineStore.persistInitialized$),
        },
        data: {
            title: '全線時刻表',
        },
        runGuardsAndResolvers: 'always',
    },
];
