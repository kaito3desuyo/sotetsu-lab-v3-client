import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RemoveMatAnimationNoopableDirective } from './remove-mat-animation-noopable.directive';

@Component({
    selector: 'app-loading',
    templateUrl: './loading.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatProgressSpinnerModule, RemoveMatAnimationNoopableDirective],
})
export class LoadingComponent {}
