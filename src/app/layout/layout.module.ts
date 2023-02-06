import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { HeaderContainerComponent } from './components/header-container/header-container.component';
import { HeaderPresentationalComponent } from './components/header-presentational/header-presentational.component';
import { SidenavContainerComponent } from './components/sidenav-container/sidenav-container.component';
import { SidenavPresentationalComponent } from './components/sidenav-presentational/sidenav-presentational.component';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        LayoutComponent,
        HeaderContainerComponent,
        HeaderPresentationalComponent,
        SidenavContainerComponent,
        SidenavPresentationalComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        FlexLayoutModule,
        MatSidenavModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatListModule,
        MatFormFieldModule,
        MatSelectModule,
    ],
    exports: [LayoutComponent],
})
export class LayoutModule {}
