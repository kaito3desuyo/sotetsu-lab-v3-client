import { NgModule } from '@angular/core';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { OperationRoutingModule } from './operation-routing.module';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationSightingsTablePresentationalComponent } from './general/components/operation-sightings-table-presentational/operation-sightings-table-presentational.component';
import { OperationSightingsTableByOperationContainerComponent } from './general/components/operation-sightings-table-by-operation-container/operation-sightings-table-by-operation-container.component';
import { OperationSightingsTableByFormationContainerComponent } from './general/components/operation-sightings-table-by-formation-container/operation-sightings-table-by-formation-container.component';
import { MatTableModule } from '@angular/material/table';
import { OperationRealTimeService } from './general/services/operation-real-time.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ReactiveFormsModule } from '@angular/forms';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { MatSortModule } from '@angular/material/sort';
import { OperationSightingsTableLegendContainerComponent } from './general/components/operation-sightings-table-legend-container/operation-sightings-table-legend-container.component';
import { OperationSightingsTableLegendPresentationalComponent } from './general/components/operation-sightings-table-legend-presentational/operation-sightings-table-legend-presentational.component';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import { MatIconModule } from '@angular/material/icon';
import { OperationTableComponent } from './operation-table/operation-table.component';
import { OperationTableTitleContainerComponent } from './general/components/operation-table-title-container/operation-table-title-container.component';
import { OperationTableTitlePresentationalComponent } from './general/components/operation-table-title-presentational/operation-table-title-presentational.component';
import { OperationTableTableContainerComponent } from './general/components/operation-table-table-container/operation-table-table-container.component';
import { OperationTableService } from './general/services/operation-table.service';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';
import { OperationTableTablePresentationalComponent } from './general/components/operation-table-table-presentational/operation-table-table-presentational.component';
import { OperationRouteDiagramComponent } from './operation-route-diagram/operation-route-diagram.component';
import { OperationRouteDiagramService } from './general/services/operation-route-diagram.service';
import { OperationRouteDiagramResolverService } from './general/services/operation-route-diagram-resolver.service';
import { OperationRouteDiagramTitleContainerComponent } from './general/components/operation-route-diagram-title-container/operation-route-diagram-title-container.component';
import { OperationRouteDiagramTitlePresentationalComponent } from './general/components/operation-route-diagram-title-presentational/operation-route-diagram-title-presentational.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { OperationRouteDiagramDrawingContainerComponent } from './general/components/operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';
import { OperationRouteDiagramDrawingPresentationalComponent } from './general/components/operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { OperationSightingsControlPanelContainerComponent } from './general/components/operation-sightings-control-panel-container/operation-sightings-control-panel-container.component';
import { OperationSightingsControlPanelPresentationalComponent } from './general/components/operation-sightings-control-panel-presentational/operation-sightings-control-panel-presentational.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OperationPastTimeComponent } from './operation-past-time/operation-past-time.component';
import { OperationSightingsSearchFormContainerComponent } from './general/components/operation-sightings-search-form-container/operation-sightings-search-form-container.component';
import { OperationSightingsSearchFormPresentationalComponent } from './general/components/operation-sightings-search-form-presentational/operation-sightings-search-form-presentational.component';
import { OperationPastTimeService } from './general/services/operation-past-time.service';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';
import { OperationSightingsTableByDateContainerComponent } from './general/components/operation-sightings-table-by-date-container/operation-sightings-table-by-date-container.component';
import { OperationSightingsTableByDatePresentationalComponent } from './general/components/operation-sightings-table-by-date-presentational/operation-sightings-table-by-date-presentational.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
    declarations: [
        OperationRealTimeComponent,
        OperationPastTimeComponent,
        OperationSightingsTableByOperationContainerComponent,
        OperationSightingsTableByFormationContainerComponent,
        OperationSightingsTableByDateContainerComponent,
        OperationSightingsTablePresentationalComponent,
        OperationSightingsTableByDatePresentationalComponent,
        OperationSightingsTableLegendContainerComponent,
        OperationSightingsTableLegendPresentationalComponent,
        OperationSightingsControlPanelContainerComponent,
        OperationSightingsControlPanelPresentationalComponent,
        OperationSightingsSearchFormContainerComponent,
        OperationSightingsSearchFormPresentationalComponent,
        OperationTableComponent,
        OperationTableTitleContainerComponent,
        OperationTableTitlePresentationalComponent,
        OperationTableTableContainerComponent,
        OperationTableTablePresentationalComponent,
        OperationRouteDiagramComponent,
        OperationRouteDiagramTitleContainerComponent,
        OperationRouteDiagramTitlePresentationalComponent,
        OperationRouteDiagramDrawingContainerComponent,
        OperationRouteDiagramDrawingPresentationalComponent
    ],
    imports: [
        CommonModule,
        FlexLayoutModule,
        ReactiveFormsModule,
        MatTableModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatRadioModule,
        MatSortModule,
        MatIconModule,
        MatToolbarModule,
        MatTooltipModule,
        MatSlideToggleModule,
        MatDatepickerModule,
        AppSharedModule,
        OperationRoutingModule,
        OperationSharedModule
    ],
    providers: [
        OperationRealTimeService,
        OperationRealTimeResolverService,
        OperationPastTimeService,
        OperationPastTimeResolverService,
        OperationTableService,
        OperationTableResolverService,
        OperationRouteDiagramService,
        OperationRouteDiagramResolverService
    ]
})
export class OperationModule {}
