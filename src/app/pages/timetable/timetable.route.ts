import { Routes } from '@angular/router';

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
        path: 'add/:calendarId',
        loadChildren: () =>
            import('./timetable-edit-form/timetable-edit-form.route').then(
                (mod) => mod.TIMETABLE_EDIT_FORM_ADD_ROUTES,
            ),
    },
    {
        path: 'copy/:calendarId',
        loadChildren: () =>
            import('./timetable-edit-form/timetable-edit-form.route').then(
                (mod) => mod.TIMETABLE_EDIT_FORM_COPY_ROUTES,
            ),
    },
    {
        path: 'update/:calendarId',
        loadChildren: () =>
            import('./timetable-edit-form/timetable-edit-form.route').then(
                (mod) => mod.TIMETABLE_EDIT_FORM_UPDATE_ROUTES,
            ),
    },
];
