import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
import { OperationPostCardCComponent } from './components/operation-post-card-c/operation-post-card-c.component';
import { OperationPostCardPComponent } from './components/operation-post-card-p/operation-post-card-p.component';
import { OperationPostCardService } from './services/operation-post-card.service';

@NgModule({
    declarations: [OperationPostCardCComponent, OperationPostCardPComponent],
    providers: [OperationPostCardService],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatSelectModule,
        MatButtonModule,
        LetModule,
        ForModule,
        IfModule,
    ],
    exports: [OperationPostCardCComponent],
})
export class OperationPostCardModule {}
