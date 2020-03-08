import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { RouterModule } from '@angular/router';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';
import { OperationRouteDiagramResolverService } from './general/services/operation-route-diagram-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: OperationRouteDiagramComponent,
        resolve: {
            from: OperationRouteDiagramResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '運用行路図'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperationRouteDiagramRoutingModule {}
