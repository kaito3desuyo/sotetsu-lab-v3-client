import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { LoadingModule } from './loading/loading.module';
import { FindByIdPipe } from './pipes/find-by-id.pipe';
import { PaddingPipe } from './pipes/padding.pipe';

@NgModule({
    imports: [CommonModule, MatToolbarModule, LoadingModule],
    exports: [PaddingPipe, FindByIdPipe],
    declarations: [PaddingPipe, FindByIdPipe],
})
export class AppSharedModule {}
