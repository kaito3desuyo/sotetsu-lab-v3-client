import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './loading.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService } from './loading.service';

@NgModule({
    imports: [CommonModule, MatProgressSpinnerModule, MatProgressBarModule],
    declarations: [LoadingComponent],
    entryComponents: [LoadingComponent],
    providers: [LoadingService],
})
export class LoadingModule {}
