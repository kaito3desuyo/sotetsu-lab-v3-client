import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AdsenseModule } from 'ng2-adsense';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { OperationRouteDiagramDrawingContainerComponent } from './general/components/operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';
import { OperationRouteDiagramDrawingPresentationalComponent } from './general/components/operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';
import { OperationRouteDiagramSearchFormContainerComponent } from './general/components/operation-route-diagram-search-form-container/operation-route-diagram-search-form-container.component';
import { OperationRouteDiagramSearchFormPresentationalComponent } from './general/components/operation-route-diagram-search-form-presentational/operation-route-diagram-search-form-presentational.component';
import { OperationRouteDiagramResolverService } from './general/services/operation-route-diagram-resolver.service';
import { OperationRouteDiagramService } from './general/services/operation-route-diagram.service';
import { OperationRouteDiagramRoutingModule } from './operation-route-diagram-routing.module';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from './states/operation-route-diagram.state';

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatCardModule,
        MatToolbarModule,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        AppSharedModule,
        OperationRouteDiagramRoutingModule,
        AdsenseModule,
    ],
    exports: [],
    declarations: [
        OperationRouteDiagramComponent,
        OperationRouteDiagramDrawingContainerComponent,
        OperationRouteDiagramDrawingPresentationalComponent,
        OperationRouteDiagramSearchFormContainerComponent,
        OperationRouteDiagramSearchFormPresentationalComponent,
    ],
    providers: [
        OperationRouteDiagramService,
        OperationRouteDiagramResolverService,
        OperationRouteDiagramStateStore,
        OperationRouteDiagramStateQuery,
    ],
})
export class OperationRouteDiagramModule {}
