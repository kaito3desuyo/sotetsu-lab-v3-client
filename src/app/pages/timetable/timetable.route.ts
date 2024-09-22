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
            import('./timetable-add/timetable-add.route').then(
                (mod) => mod.TIMETABLE_ADD_ROUTES,
            ),
    },
    {
        path: 'copy',
        loadChildren: () =>
            import('./timetable-copy/timetable-copy.route').then(
                (mod) => mod.TIMETABLE_COPY_ROUTES,
            ),
    },
    {
        path: 'update',
        loadChildren: () =>
            import('./timetable-update/timetable-update.route').then(
                (mod) => mod.TIMETABLE_UPDATE_ROUTES,
            ),
    },
];
