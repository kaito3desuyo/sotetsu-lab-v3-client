import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { IStation } from 'src/app/general/interfaces/station';
import { ITripOperationList } from 'src/app/general/interfaces/trip-operation-list';
import { findIndex } from 'lodash';
import moment from 'moment';

@Component({
  selector: 'app-operation-route-diagram-drawing-presentational',
  templateUrl:
    './operation-route-diagram-drawing-presentational.component.html',
  styleUrls: [
    './operation-route-diagram-drawing-presentational.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationRouteDiagramDrawingPresentationalComponent {
  @Input() stations: IStation[];
  @Input() tripOperationLists: ITripOperationList[];

  constructor() {}

  returnTimeString(str: string) {
    return moment(str, 'HH:mm:ss').format('HHmm');
  }

  returnStationIndex(id: string) {
    return findIndex(this.stations, obj => {
      return obj.id === id;
    });
  }
}
