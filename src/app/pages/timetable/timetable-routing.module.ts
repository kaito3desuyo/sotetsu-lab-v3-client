import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableUpdateResolverService } from './general/services/timetable-update-resolver.service';
import { TimetableUpdateComponent } from './timetable-update/timetable-update.component';

const routes: Routes = [
    {
        path: 'all-line',
        loadChildren: () =>
            import('./timetable-all-line/timetable-all-line.module').then(
                (mod) => mod.TimetableAllLineModule
            ),
    },
    {
        path: 'station',
        loadChildren: () =>
            import('./timetable-station/timetable-station.module').then(
                (mod) => mod.TimetableStationModule
            ),
    },
    {
        path: 'add/:calendarId',
        loadChildren: () =>
            import('./timetable-add/timetable-add.module').then(
                (mod) => mod.TimetableAddModule
            ),
    },
    {
        path: 'copy',
        loadChildren: () =>
            import('./timetable-copy/timetable-copy.module').then(
                (mod) => mod.TimetableCopyModule
            ),
    },
    {
        path: 'update/:blockId',
        component: TimetableUpdateComponent,
        resolve: {
            from: TimetableUpdateResolverService,
        },
        data: {
            title: '列車を編集する',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableRoutingModule {}
