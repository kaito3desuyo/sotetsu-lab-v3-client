import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { OperationRealTimeResolverService } from './services/operation-real-time-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: OperationRealTimeComponent,
        resolve: {
            operationRealTime: OperationRealTimeResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: 'リアルタイム運用情報',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class OperationRealTimeRoutingModule {}
