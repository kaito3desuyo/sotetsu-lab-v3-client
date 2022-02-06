import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AdsenseModule } from 'ng2-adsense';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { OperationTableTableContainerComponent } from './general/components/operation-table-table-container/operation-table-table-container.component';
import { OperationTableTablePresentationalComponent } from './general/components/operation-table-table-presentational/operation-table-table-presentational.component';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';
import { OperationTableService } from './general/services/operation-table.service';
import { OperationTableRoutingModule } from './operation-table-routing.module';
import { OperationTableComponent } from './operation-table.component';
import {
    OperationTableStateQuery,
    OperationTableStateStore,
} from './states/operation-table.state';
import { OperationTableMainCComponent } from './components/operation-table-main-c/operation-table-main-c.component';
import { OperationTableHeaderCComponent } from './components/operation-table-header-c/operation-table-header-c.component';
import { OperationTableHeaderPComponent } from './components/operation-table-header-p/operation-table-header-p.component';

@NgModule({
    declarations: [
        OperationTableComponent,
        OperationTableTableContainerComponent,
        OperationTableTablePresentationalComponent,
        OperationTableMainCComponent,
        OperationTableHeaderCComponent,
        OperationTableHeaderPComponent,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        OperationTableRoutingModule,
        FlexLayoutModule,
        MatCardModule,
        MatToolbarModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        AdsenseModule,
        OperationSearchCardModule,
    ],
    providers: [
        OperationTableService,
        OperationTableResolverService,
        OperationTableStateStore,
        OperationTableStateQuery,
    ],
})
export class OperationTableModule {}
