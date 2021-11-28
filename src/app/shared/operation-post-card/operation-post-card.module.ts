import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { OperationPostCardCComponent } from './components/operation-post-card-c/operation-post-card-c.component';
import { OperationPostCardPComponent } from './components/operation-post-card-p/operation-post-card-p.component';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
