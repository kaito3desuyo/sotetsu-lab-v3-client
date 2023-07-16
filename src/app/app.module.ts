import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { LayoutComponent } from './layout/layout.component';
import { AppSharedModule } from './shared/app-shared/app-shared.module';

@NgModule({
    declarations: [AppComponent],
    imports: [CoreModule, LayoutComponent, AppRoutingModule, AppSharedModule],
    bootstrap: [AppComponent],
})
export class AppModule {}
