import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

const routes: Routes = [
    {
        path: 'real-time',
        loadChildren: () =>
            import('./operation-real-time/operation-real-time.route').then(
                (mod) => mod.OPERATION_REAL_TIME_ROUTES
            ),
    },
    {
        path: 'past-time',
        loadChildren: () =>
            import('./operation-past-time/operation-past-time.route').then(
                (mod) => mod.OPERATION_PAST_TIME_ROUTES
            ),
    },
    {
        path: 'table',
        loadChildren: () =>
            import('./operation-table/operation-table.route').then(
                (mod) => mod.OPERATION_TABLE_ROUTES
            ),
    },
    {
        path: 'route-diagram',
        loadChildren: () =>
            import(
                './operation-route-diagram/operation-route-diagram.module'
            ).then((mod) => mod.OperationRouteDiagramModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class OperationRoutingModule {}
