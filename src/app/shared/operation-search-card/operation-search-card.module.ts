import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationSearchCardCComponent } from './components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardPComponent } from './components/operation-search-card-p/operation-search-card-p.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { FormsModule } from '@angular/forms';
import { OperationSearchCardService } from './services/operation-search-card.service';
import { RouterModule } from '@angular/router';

@NgModule({
    declarations: [
        OperationSearchCardCComponent,
        OperationSearchCardPComponent,
    ],
    providers: [OperationSearchCardService],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        FlexLayoutModule,
        MatCardModule,
        MatListModule,
        MatSelectModule,
        MatButtonModule,
        PipesModule,
    ],
    exports: [OperationSearchCardCComponent],
})
export class OperationSearchCardModule {}
