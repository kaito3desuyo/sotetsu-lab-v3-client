import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { LayoutModule } from './layout/layout.module';
import { AppSharedModule } from './shared/app-shared/app-shared.module';

@NgModule({
    declarations: [AppComponent],
    imports: [CoreModule, LayoutModule, AppRoutingModule, AppSharedModule],
    bootstrap: [AppComponent],
})
export class AppModule {}
