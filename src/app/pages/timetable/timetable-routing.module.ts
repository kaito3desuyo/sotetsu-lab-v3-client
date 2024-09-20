import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'all-line',
        loadChildren: () =>
            import('./timetable-all-line/timetable-all-line.module').then(
                (mod) => mod.TimetableAllLineModule,
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
            import('./timetable-add/timetable-add.module').then(
                (mod) => mod.TimetableAddModule,
            ),
    },
    {
        path: 'copy',
        loadChildren: () =>
            import('./timetable-copy/timetable-copy.module').then(
                (mod) => mod.TimetableCopyModule,
            ),
    },
    {
        path: 'update',
        loadChildren: () =>
            import('./timetable-update/timetable-update.module').then(
                (mod) => mod.TimetableUpdateModule,
            ),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableRoutingModule {}
