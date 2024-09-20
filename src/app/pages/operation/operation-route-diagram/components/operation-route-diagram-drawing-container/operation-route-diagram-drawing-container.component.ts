import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { OperationRouteDiagramStateQuery } from '../../states/operation-route-diagram.state';
import { OperationRouteDiagramDrawingPresentationalComponent } from '../operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';

@Component({
    standalone: true,
    selector: 'app-operation-route-diagram-drawing-container',
    templateUrl: './operation-route-diagram-drawing-container.component.html',
    styleUrls: ['./operation-route-diagram-drawing-container.component.scss'],
    imports: [OperationRouteDiagramDrawingPresentationalComponent],
})
export class OperationRouteDiagramDrawingContainerComponent {
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );
    readonly #operationRouteDiagramStateQuery = inject(
        OperationRouteDiagramStateQuery,
    );

    readonly calendar = toSignal(
        this.#operationRouteDiagramStateQuery.calendar$,
    );
    readonly operation = toSignal(
        this.#operationRouteDiagramStateQuery.operation$,
    );
    readonly tripOperationLists = toSignal(
        this.#operationRouteDiagramStateQuery.tripOperationLists$,
    );
    readonly stations = toSignal(
        this.#operationRouteDiagramStateQuery.stations$,
    );

    readonly drawingDisplayed = toSignal(
        this.#operationRouteDiagramStateQuery.operationId$.pipe(
            map((id) => !!id),
        ),
    );

    onReceiveClickNavigateTimetable(
        ev: OperationRouteDiagramNavigateTimetable,
    ): void {
        this.#operationRouteDiagramService.emitNavigateTimetableEvent(ev);
    }
}
