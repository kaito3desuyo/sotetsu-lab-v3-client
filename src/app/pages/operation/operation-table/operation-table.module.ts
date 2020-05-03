import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationTableRoutingModule } from './operation-table-routing.module';
import { OperationTableComponent } from './operation-table.component';
import { OperationTableTableContainerComponent } from './general/components/operation-table-table-container/operation-table-table-container.component';
import { OperationTableTablePresentationalComponent } from './general/components/operation-table-table-presentational/operation-table-table-presentational.component';
import { OperationTableService } from './general/services/operation-table.service';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';
import { MatCardModule } from '@angular/material/card';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { OperationTableSearchFormContainerComponent } from './general/components/operation-table-search-form-container/operation-table-search-form-container.component';
import { OperationTableSearchFormPresentationalComponent } from './general/components/operation-table-search-form-presentational/operation-table-search-form-presentational.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AdsenseModule } from 'ng2-adsense';

@NgModule({
    declarations: [
        OperationTableComponent,
        OperationTableTableContainerComponent,
        OperationTableTablePresentationalComponent,
        OperationTableSearchFormContainerComponent,
        OperationTableSearchFormPresentationalComponent,
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
    ],
    providers: [OperationTableService, OperationTableResolverService],
})
export class OperationTableModule {}
