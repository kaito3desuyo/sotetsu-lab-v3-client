import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeaderContainerComponent } from './components/header-container/header-container.component';
import { HeaderPresentationalComponent } from './components/header-presentational/header-presentational.component';
import { SidenavContainerComponent } from './components/sidenav-container/sidenav-container.component';
import { SidenavPresentationalComponent } from './components/sidenav-presentational/sidenav-presentational.component';

@NgModule({
  declarations: [
    LayoutComponent,
    HeaderContainerComponent,
    HeaderPresentationalComponent,
    SidenavContainerComponent,
    SidenavPresentationalComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FlexLayoutModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ],
  exports: [LayoutComponent]
})
export class LayoutModule {}
