import { Routes } from '@angular/router';
import { timetableEditGuard } from 'src/app/core/guards/timetable-edit.guard';

export const TIMETABLE_ROUTES: Routes = [
    {
        path: 'all-line',
        loadChildren: () =>
            import('./timetable-all-line/timetable-all-line.route').then(
                (mod) => mod.TIMETABLE_ALL_LINE_ROUTES,
            ),
    },
    {
        path: 'station',
        loadChildren: () =>
            import('./timetable-station/timetable-station.route').then(
                (mod) => mod.TIMETABLE_STATION_ROUTES,
            ),
    },
    {
        // calendar_id / trip_direction / trip_block_id は matrix param で受ける
        // （timetable-station 等アプリ全体の慣習に合わせる。path param にしない）。
        path: 'add',
        canActivate: [timetableEditGuard],
        loadChildren: () =>
            import('./timetable-edit-form/timetable-edit-form.route').then(
                (mod) => mod.TIMETABLE_EDIT_FORM_ADD_ROUTES,
            ),
    },
    {
        path: 'copy',
        canActivate: [timetableEditGuard],
        loadChildren: () =>
            import('./timetable-edit-form/timetable-edit-form.route').then(
                (mod) => mod.TIMETABLE_EDIT_FORM_COPY_ROUTES,
            ),
    },
    {
        path: 'update',
        canActivate: [timetableEditGuard],
        loadChildren: () =>
            import('./timetable-edit-form/timetable-edit-form.route').then(
                (mod) => mod.TIMETABLE_EDIT_FORM_UPDATE_ROUTES,
            ),
    },
];
