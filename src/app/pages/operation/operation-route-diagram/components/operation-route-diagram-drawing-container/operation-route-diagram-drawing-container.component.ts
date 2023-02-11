import { Component } from '@angular/core';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { OperationRouteDiagramStateQuery } from '../../states/operation-route-diagram.state';

@Component({
    selector: 'app-operation-route-diagram-drawing-container',
    templateUrl: './operation-route-diagram-drawing-container.component.html',
    styleUrls: ['./operation-route-diagram-drawing-container.component.scss'],
})
export class OperationRouteDiagramDrawingContainerComponent {
    readonly calendar$ = this.operationRouteDiagramStateQuery.calendar$;
    readonly operation$ = this.operationRouteDiagramStateQuery.operation$;
    readonly tripOperationLists$ =
        this.operationRouteDiagramStateQuery.tripOperationLists$;
    readonly stations$ = this.operationRouteDiagramStateQuery.stations$;

    constructor(
        private readonly operationRouteDiagramService: OperationRouteDiagramService,
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery
    ) {}

    onReceiveClickNavigateTimetable(
        ev: OperationRouteDiagramNavigateTimetable
    ): void {
        this.operationRouteDiagramService.emitNavigateTimetableEvent(ev);
    }
}
