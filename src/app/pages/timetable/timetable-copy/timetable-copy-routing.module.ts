import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableCopyResolverService } from './services/timetable-copy-resolver.service';
import { TimetableCopyComponent } from './timetable-copy.component';

const routes: Routes = [
    {
        path: '',
        component: TimetableCopyComponent,
        resolve: {
            from: TimetableCopyResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '列車をコピーして追加する',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableCopyRoutingModule {}
