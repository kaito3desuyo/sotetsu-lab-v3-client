import { Routes } from '@angular/router';
import { TimetableAddService } from './services/timetable-add.service';
import { TimetableAddResolverService } from './services/timetable-add-resolver.service';
import { TIMETABLE_EDIT_FORM_PROVIDERS } from 'src/app/shared/timetable-edit-form/timetable-edit-form.provider';

export const TIMETABLE_ADD_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-add.component').then(
                (mod) => mod.TimetableAddComponent,
            ),
        providers: [
            TimetableAddService,
            TimetableAddResolverService,
            ...TIMETABLE_EDIT_FORM_PROVIDERS,
        ],
        resolve: {
            from: TimetableAddResolverService,
        },
        data: {
            title: '列車を追加する',
        },
        runGuardsAndResolvers: 'always',
    },
];
