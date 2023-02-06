import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { OperationPostCardCComponent } from './components/operation-post-card-c/operation-post-card-c.component';
import { OperationPostCardPComponent } from './components/operation-post-card-p/operation-post-card-p.component';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { OperationPostCardService } from './services/operation-post-card.service';

@NgModule({
    declarations: [OperationPostCardCComponent, OperationPostCardPComponent],
    providers: [OperationPostCardService],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatFormFieldModule,
        MatCardModule,
        MatInputModule,
        MatRadioModule,
        MatSelectModule,
        MatButtonModule,
    ],
    exports: [OperationPostCardCComponent],
})
export class OperationPostCardModule {}
