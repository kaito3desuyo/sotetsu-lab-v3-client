import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableUpdateResolverService } from './services/timetable-update-resolver.service';
import { TimetableUpdateComponent } from './timetable-update.component';

const routes: Routes = [
    {
        path: '',
        component: TimetableUpdateComponent,
        resolve: {
            from: TimetableUpdateResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '列車を編集する',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableUpdateRoutingModule {}
