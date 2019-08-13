import { NgModule } from '@angular/core';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { OperationRoutingModule } from './operation-routing.module';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationSightingsTablePresentationalComponent } from './general/components/operation-sightings-table-presentational/operation-sightings-table-presentational.component';
import { OperationSightingsTableByOperationContainerComponent } from './general/components/operation-sightings-table-by-operation-container/operation-sightings-table-by-operation-container.component';
import { OperationSightingsTableByFormationContainerComponent } from './general/components/operation-sightings-table-by-formation-container/operation-sightings-table-by-formation-container.component';

@NgModule({
  declarations: [
    OperationRealTimeComponent,
    OperationSightingsTableByOperationContainerComponent,
    OperationSightingsTableByFormationContainerComponent,
    OperationSightingsTablePresentationalComponent
  ],
  imports: [CommonModule, FlexLayoutModule, OperationRoutingModule],
  providers: []
})
export class OperationModule {}
