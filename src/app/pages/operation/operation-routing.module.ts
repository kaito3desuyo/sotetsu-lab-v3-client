import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';
import { OperationRouteDiagramComponent } from './operation-route-diagram/operation-route-diagram.component';
import { OperationRouteDiagramResolverService } from './general/services/operation-route-diagram-resolver.service';
import { OperationPastTimeComponent } from './operation-past-time/operation-past-time.component';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';
import { OperationTableComponent } from './operation-table/operation-table.component';

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
        path: 'table/:calendarId',
        component: OperationTableComponent,
        resolve: {
            operationTable: OperationTableResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '運用表'
        }
    },
    {
        path: 'route-diagram/:operationId',
        component: OperationRouteDiagramComponent,
        resolve: {
            operationRouteDiagram: OperationRouteDiagramResolverService
        },
        data: {
            title: '運用行路図'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperationRoutingModule {}
