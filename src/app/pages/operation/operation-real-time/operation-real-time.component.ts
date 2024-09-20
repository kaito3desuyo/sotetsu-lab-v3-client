import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationRealTimeHeaderCComponent } from './components/operation-real-time-header-c/operation-real-time-header-c.component';
import { OperationRealTimeMainCComponent } from './components/operation-real-time-main-c/operation-real-time-main-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    styleUrls: ['./operation-real-time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        OperationRealTimeHeaderCComponent,
        OperationRealTimeMainCComponent,
    ],
    providers: [RxState],
})
export class OperationRealTimeComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);

    constructor() {
        this.#state.hold(this.#route.data, (data: { title: string }) => {
            this.#titleService.setTitle(data.title);
        });
    }
}
