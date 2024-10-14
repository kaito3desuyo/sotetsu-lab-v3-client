import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationPastTimeHeaderCComponent } from './components/operation-past-time-header-c/operation-past-time-header-c.component';
import { OperationPastTimeMainCComponent } from './components/operation-past-time-main-c/operation-past-time-main-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time',
    templateUrl: './operation-past-time.component.html',
    styleUrls: ['./operation-past-time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        OperationPastTimeHeaderCComponent,
        OperationPastTimeMainCComponent,
    ],
    providers: [RxState],
})
export class OperationPastTimeComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);

    constructor() {
        this.#state.hold(this.#route.data, (data: { title: string }) => {
            this.#titleService.setTitle(data.title);
        });

        this.#state.hold(
            this.#operationSearchCardService.receiveSearchOperationTableEvent(),
            (calendarId) => {
                this.#router.navigate([
                    '/operation/table',
                    { calendar_id: calendarId },
                ]);
            },
        );

        this.#state.hold(
            this.#operationSearchCardService.receiveSearchOperationRouteDiagramEvent(),
            (operationId) => {
                this.#router.navigate([
                    '/operation/route-diagram',
                    { operation_id: operationId },
                ]);
            },
        );
    }
}
