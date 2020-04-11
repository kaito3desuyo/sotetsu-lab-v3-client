import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationSightingAddFormContainerComponent } from './components/operation-sighting-add-form-container/operation-sighting-add-form-container.component';
import { OperationSightingAddFormPresentationalComponent } from './components/operation-sighting-add-form-presentational/operation-sighting-add-form-presentational.component';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationSightingAddFormService } from './services/operation-sighting-add-form.service';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatCardModule,
        MatInputModule,
        MatSelectModule,
        MatRadioModule,
        MatButtonModule,
    ],
    exports: [
        OperationSightingAddFormContainerComponent,
        OperationSightingAddFormPresentationalComponent,
    ],
    declarations: [
        OperationSightingAddFormContainerComponent,
        OperationSightingAddFormPresentationalComponent,
    ],
    providers: [OperationSightingAddFormService],
})
export class OperationSharedModule {}
