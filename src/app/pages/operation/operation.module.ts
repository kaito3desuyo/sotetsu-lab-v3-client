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

@NgModule({
  declarations: [
    OperationRealTimeComponent,
    OperationSightingsTableByOperationContainerComponent,
    OperationSightingsTableByFormationContainerComponent,
    OperationSightingsTablePresentationalComponent,
    OperationSightingsTableLegendContainerComponent,
    OperationSightingsTableLegendPresentationalComponent,
    OperationSightingsControlPanelContainerComponent,
    OperationSightingsControlPanelPresentationalComponent,
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
    MatSlideToggleModule,
    AppSharedModule,
    OperationRoutingModule,
    OperationSharedModule
  ],
  providers: [
    OperationRealTimeService,
    OperationRealTimeResolverService,
    OperationTableService,
    OperationTableResolverService,
    OperationRouteDiagramService,
    OperationRouteDiagramResolverService
  ]
})
export class OperationModule {}
