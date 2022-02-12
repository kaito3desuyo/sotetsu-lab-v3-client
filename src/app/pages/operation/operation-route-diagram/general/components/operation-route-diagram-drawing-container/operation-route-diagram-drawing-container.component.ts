import { Component } from '@angular/core';
import { OperationRouteDiagramStateQuery } from '../../../states/operation-route-diagram.state';

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
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery
    ) {}
}
