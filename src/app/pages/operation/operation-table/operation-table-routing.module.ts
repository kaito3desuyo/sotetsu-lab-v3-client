import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OperationTableComponent } from './operation-table.component';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: OperationTableComponent,
        resolve: {
            from: OperationTableResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '運用表',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class OperationTableRoutingModule {}
