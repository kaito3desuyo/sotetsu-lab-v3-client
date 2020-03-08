import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationRealTimeRoutingModule } from './operation-real-time-routing.module';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationSightingsTableByOperationContainerComponent } from './general/components/operation-sightings-table-by-operation-container/operation-sightings-table-by-operation-container.component';
import { OperationSightingsTableByFormationContainerComponent } from './general/components/operation-sightings-table-by-formation-container/operation-sightings-table-by-formation-container.component';
import { OperationSightingsTablePresentationalComponent } from './general/components/operation-sightings-table-presentational/operation-sightings-table-presentational.component';
import { OperationSightingsTableLegendContainerComponent } from './general/components/operation-sightings-table-legend-container/operation-sightings-table-legend-container.component';
import { OperationSightingsTableLegendPresentationalComponent } from './general/components/operation-sightings-table-legend-presentational/operation-sightings-table-legend-presentational.component';
import { OperationSightingsControlPanelContainerComponent } from './general/components/operation-sightings-control-panel-container/operation-sightings-control-panel-container.component';
import { OperationSightingsControlPanelPresentationalComponent } from './general/components/operation-sightings-control-panel-presentational/operation-sightings-control-panel-presentational.component';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { OperationRealTimeService } from './general/services/operation-real-time.service';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';

@NgModule({
    declarations: [
        OperationRealTimeComponent,
        OperationSightingsTableByOperationContainerComponent,
        OperationSightingsTableByFormationContainerComponent,
        OperationSightingsTablePresentationalComponent,
        OperationSightingsTableLegendContainerComponent,
        OperationSightingsTableLegendPresentationalComponent,
        OperationSightingsControlPanelContainerComponent,
        OperationSightingsControlPanelPresentationalComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatSlideToggleModule,
        MatCardModule,
        MatTableModule,
        MatIconModule,
        MatFormFieldModule,
        MatDatepickerModule,
        OperationRealTimeRoutingModule,
        OperationSharedModule
    ],
    exports: [],
    providers: [OperationRealTimeService, OperationRealTimeResolverService]
})
export class OperationRealTimeModule {}
