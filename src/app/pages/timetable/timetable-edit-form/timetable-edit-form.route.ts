import { Routes } from '@angular/router';
import { TimetableEditFormResolverService } from './services/timetable-edit-form-resolver.service';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import { ETimetableEditFormMode } from './special/enums/timetable-edit-form.enum';

/**
 * B8-5 / 30-architecture.md §1.2: add/copy/update の 3 ページを
 * 単一コンポーネント（TimetableEditFormComponent）+ mode に統合する。
 * URL のパス構造（add|copy|update/:calendarId、trip_direction/trip_block_id は
 * matrix param）は移行前と同じ形（timetable-station 等と同じ matrix param 慣習）を踏襲する。
 */
function buildRoutes(mode: ETimetableEditFormMode, title: string): Routes {
    return [
        {
            path: '',
            loadComponent: () =>
                import('./timetable-edit-form.component').then(
                    (mod) => mod.TimetableEditFormComponent,
                ),
            providers: [
                TimetableEditFormService,
                TimetableEditFormResolverService,
            ],
            resolve: {
                from: TimetableEditFormResolverService,
            },
            data: {
                title,
                mode,
            },
        },
    ];
}

export const TIMETABLE_EDIT_FORM_ADD_ROUTES: Routes = buildRoutes(
    ETimetableEditFormMode.ADD,
    '列車を追加する',
);

export const TIMETABLE_EDIT_FORM_COPY_ROUTES: Routes = buildRoutes(
    ETimetableEditFormMode.COPY,
    '列車をコピーして追加する',
);

export const TIMETABLE_EDIT_FORM_UPDATE_ROUTES: Routes = buildRoutes(
    ETimetableEditFormMode.UPDATE,
    '列車を編集する',
);
