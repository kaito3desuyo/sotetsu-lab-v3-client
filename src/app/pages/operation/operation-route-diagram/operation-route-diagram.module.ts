import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationRouteDiagramRoutingModule } from './operation-route-diagram-routing.module';
import { OperationRouteDiagramService } from './general/services/operation-route-diagram.service';
import { OperationRouteDiagramResolverService } from './general/services/operation-route-diagram-resolver.service';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';
import { OperationRouteDiagramDrawingContainerComponent } from './general/components/operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';
import { OperationRouteDiagramDrawingPresentationalComponent } from './general/components/operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { MatButtonModule } from '@angular/material/button';
import { OperationRouteDiagramSearchFormContainerComponent } from './general/components/operation-route-diagram-search-form-container/operation-route-diagram-search-form-container.component';
import { OperationRouteDiagramSearchFormPresentationalComponent } from './general/components/operation-route-diagram-search-form-presentational/operation-route-diagram-search-form-presentational.component';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { AdsenseModule } from 'ng2-adsense';

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
    ],
})
export class OperationRouteDiagramModule {}
