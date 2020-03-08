import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { OperationPastTimeComponent } from './operation-past-time/operation-past-time.component';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';

const routes: Routes = [
    {
        path: 'real-time',
        loadChildren: () =>
            import('./operation-real-time/operation-real-time.module').then(
                mod => mod.OperationRealTimeModule
            )
    },
    {
        path: 'past-time',
        component: OperationPastTimeComponent,
        resolve: {
            from: OperationPastTimeResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '過去の運用情報'
        }
    },
    {
        path: 'table',
        loadChildren: () =>
            import('./operation-table/operation-table.module').then(
                mod => mod.OperationTableModule
            )
    },
    {
        path: 'route-diagram',
        loadChildren: () =>
            import(
                './operation-route-diagram/operation-route-diagram.module'
            ).then(mod => mod.OperationRouteDiagramModule)
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperationRoutingModule {}
