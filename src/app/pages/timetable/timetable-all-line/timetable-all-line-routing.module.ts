import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableAllLineResolverService } from './services/timetable-all-line-resolver.service';
import { TimetableAllLineComponent } from './timetable-all-line.component';

const routes: Routes = [
    {
        path: '',
        component: TimetableAllLineComponent,
        resolve: {
            from: TimetableAllLineResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '全線時刻表',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableAllLineRoutingModule {}
