import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { OperationTableHeaderCComponent } from './components/operation-table-header-c/operation-table-header-c.component';
import { OperationTableHeaderPComponent } from './components/operation-table-header-p/operation-table-header-p.component';
import { OperationTableMainCComponent } from './components/operation-table-main-c/operation-table-main-c.component';
import { OperationTableTableContainerComponent } from './components/operation-table-table-container/operation-table-table-container.component';
import { OperationTableTablePresentationalComponent } from './components/operation-table-table-presentational/operation-table-table-presentational.component';
import { OperationTableRoutingModule } from './operation-table-routing.module';
import { OperationTableComponent } from './operation-table.component';
import { OperationTableFormatStationNamePipe } from './pipes/operation-table-format-station-name.pipe';
import { OperationTableFormatTripClassNamePipe } from './pipes/operation-table-format-trip-class-name.pipe';
import { OperationTableResolverService } from './services/operation-table-resolver.service';
import { OperationTableService } from './services/operation-table.service';
import {
    OperationTableStateQuery,
    OperationTableStateStore,
} from './states/operation-table.state';

@NgModule({
    declarations: [
        OperationTableComponent,
        OperationTableTableContainerComponent,
        OperationTableTablePresentationalComponent,
        OperationTableMainCComponent,
        OperationTableHeaderCComponent,
        OperationTableHeaderPComponent,
        OperationTableFormatStationNamePipe,
        OperationTableFormatTripClassNamePipe,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        OperationTableRoutingModule,
        MatCardModule,
        MatToolbarModule,
        AdsenseModule,
        OperationSearchCardModule,
        PipesModule,
        LetModule,
        ForModule,
        IfModule,
    ],
    providers: [
        OperationTableService,
        OperationTableResolverService,
        OperationTableStateStore,
        OperationTableStateQuery,
    ],
})
export class OperationTableModule {}
