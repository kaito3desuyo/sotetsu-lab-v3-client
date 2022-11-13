import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableAddResolverService } from './services/timetable-add-resolver.service';
import { TimetableAddComponent } from './timetable-add.component';

const routes: Routes = [
    {
        path: '',
        component: TimetableAddComponent,
        resolve: {
            from: TimetableAddResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '列車を追加する',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableAddRoutingModule {}
