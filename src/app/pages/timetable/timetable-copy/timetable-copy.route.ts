import { Routes } from '@angular/router';
import { TimetableCopyService } from './services/timetable-copy.service';
import { TimetableCopyResolverService } from './services/timetable-copy-resolver.service';
import { TIMETABLE_EDIT_FORM_PROVIDERS } from 'src/app/shared/timetable-edit-form/timetable-edit-form.provider';

export const TIMETABLE_COPY_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./timetable-copy.component').then(
                (mod) => mod.TimetableCopyComponent,
            ),
        providers: [
            TimetableCopyService,
            TimetableCopyResolverService,
            ...TIMETABLE_EDIT_FORM_PROVIDERS,
        ],
        resolve: {
            from: TimetableCopyResolverService,
        },
        data: {
            title: '列車をコピーして追加する',
        },
        runGuardsAndResolvers: 'always',
    },
];
