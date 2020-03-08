import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OperationPastTimeComponent } from './operation-past-time.component';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: OperationPastTimeComponent,
        resolve: {
            from: OperationPastTimeResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '過去の運用情報'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperationPastTimeRoutingModule {}
