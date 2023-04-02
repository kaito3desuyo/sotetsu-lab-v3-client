import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationSearchCardCComponent } from './components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardPComponent } from './components/operation-search-card-p/operation-search-card-p.component';
import { OperationSearchCardService } from './services/operation-search-card.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from './states/operation-search-card.state';

@NgModule({
    declarations: [
        OperationSearchCardCComponent,
        OperationSearchCardPComponent,
    ],
    providers: [
        OperationSearchCardService,
        OperationSearchCardStateStore,
        OperationSearchCardStateQuery,
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatRippleModule,
        PipesModule,
        LetModule,
        ForModule,
        IfModule,
    ],
    exports: [OperationSearchCardCComponent],
})
export class OperationSearchCardModule {}
