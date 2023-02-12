import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
import { HeaderContainerComponent } from './components/header-container/header-container.component';
import { HeaderPresentationalComponent } from './components/header-presentational/header-presentational.component';
import { SidenavContainerComponent } from './components/sidenav-container/sidenav-container.component';
import { SidenavPresentationalComponent } from './components/sidenav-presentational/sidenav-presentational.component';
import { LayoutComponent } from './layout.component';

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
        LetModule,
        ForModule,
        IfModule,
    ],
    exports: [LayoutComponent],
})
export class LayoutModule {}
