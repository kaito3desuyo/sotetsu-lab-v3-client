import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { RouterModule } from '@angular/router';
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
