import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

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
        loadChildren: () =>
            import('./operation-past-time/operation-past-time.module').then(
                mod => mod.OperationPastTimeModule
            )
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
