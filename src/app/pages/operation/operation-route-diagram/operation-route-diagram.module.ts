import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RxFor } from '@rx-angular/template/for';
import { RxIf } from '@rx-angular/template/if';
import { RxLet } from '@rx-angular/template/let';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { OperationRouteDiagramDrawingContainerComponent } from './components/operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';
import { OperationRouteDiagramDrawingPresentationalComponent } from './components/operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';
import { OperationRouteDiagramHeaderCComponent } from './components/operation-route-diagram-header-c/operation-route-diagram-header-c.component';
import { OperationRouteDiagramHeaderPComponent } from './components/operation-route-diagram-header-p/operation-route-diagram-header-p.component';
import { OperationRouteDiagramMainCComponent } from './components/operation-route-diagram-main-c/operation-route-diagram-main-c.component';
import { OperationRouteDiagramRoutingModule } from './operation-route-diagram-routing.module';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';
import { OperationRouteDiagramFormatStationNamePipe } from './pipes/operation-route-diagram-format-station-name.pipe';
import { OperationRouteDiagramResolverService } from './services/operation-route-diagram-resolver.service';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from './states/operation-route-diagram.state';

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatToolbarModule,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        AppSharedModule,
        OperationRouteDiagramRoutingModule,
        AdsenseModule,
        PipesModule,
        OperationSearchCardModule,
        RxLet,
        RxFor,
        RxIf,
    ],
    exports: [],
    declarations: [
        OperationRouteDiagramComponent,
        OperationRouteDiagramDrawingContainerComponent,
        OperationRouteDiagramDrawingPresentationalComponent,
        OperationRouteDiagramHeaderCComponent,
        OperationRouteDiagramHeaderPComponent,
        OperationRouteDiagramMainCComponent,
        OperationRouteDiagramFormatStationNamePipe,
    ],
    providers: [
        OperationRouteDiagramService,
        OperationRouteDiagramResolverService,
        OperationRouteDiagramStateStore,
        OperationRouteDiagramStateQuery,
    ],
})
export class OperationRouteDiagramModule {}
