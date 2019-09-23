import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';

@Component({
  selector: 'app-operation-route-diagram-title-presentational',
  templateUrl: './operation-route-diagram-title-presentational.component.html',
  styleUrls: ['./operation-route-diagram-title-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationRouteDiagramTitlePresentationalComponent
  implements OnChanges {
  @Input() calendar: ICalendar;
  @Input() operation: IOperation;

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    console.log(changes);
  }
}
