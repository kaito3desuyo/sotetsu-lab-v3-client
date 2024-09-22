import { Routes } from '@angular/router';
import { TIMETABLE_EDIT_FORM_PROVIDERS } from 'src/app/shared/timetable-edit-form/timetable-edit-form.provider';
import { TimetableUpdateResolverService } from './services/timetable-update-resolver.service';
import { TimetableUpdateService } from './services/timetable-update.service';

export const TIMETABLE_UPDATE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-update.component').then(
                (mod) => mod.TimetableUpdateComponent,
            ),
        providers: [
            TimetableUpdateService,
            TimetableUpdateResolverService,
            ...TIMETABLE_EDIT_FORM_PROVIDERS,
        ],
        resolve: {
            from: TimetableUpdateResolverService,
        },
        data: {
            title: '列車を編集する',
        },
        runGuardsAndResolvers: 'always',
    },
];
