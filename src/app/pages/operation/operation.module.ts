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
import { OperationSightingAddFormContainerComponent } from './general/components/operation-sighting-add-form-container/operation-sighting-add-form-container.component';
import { OperationSightingAddFormPresentationalComponent } from './general/components/operation-sighting-add-form-presentational/operation-sighting-add-form-presentational.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    OperationRealTimeComponent,
    OperationSightingsTableByOperationContainerComponent,
    OperationSightingsTableByFormationContainerComponent,
    OperationSightingsTablePresentationalComponent,
    OperationSightingAddFormContainerComponent,
    OperationSightingAddFormPresentationalComponent
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
    OperationRoutingModule
  ],
  providers: [OperationRealTimeService]
})
export class OperationModule {}
