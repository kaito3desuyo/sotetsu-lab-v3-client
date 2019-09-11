import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-operation-sightings-table-presentational',
  templateUrl: './operation-sightings-table-presentational.component.html',
  styleUrls: ['./operation-sightings-table-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingsTablePresentationalComponent
  implements OnInit, OnChanges {
  @Input() mode: 'formation' | 'operation';
  @Input() data: IOperationSightingTable[];
  @Input() displayedColumns: string[] = [];
  dataSource: MatTableDataSource<IOperationSightingTable>;

  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ちゃん時', changes);
    if (changes.data) {
      this.dataSource = new MatTableDataSource(changes.data.currentValue);
      this.dataSource.sort = this.sort;
    }
  }

  ngOnInit() {}

  getOperationNumberColor(operationNumber: string) {
    if (!operationNumber) {
      return 'transparent';
    }
    if (operationNumber === '100') {
      return 'rgba(0,0,0,0.12)';
    }
    switch (operationNumber[0]) {
      case '1':
        return 'rgba(244,67,54,0.12)';
      case '4':
        return 'rgba(76,175,80,0.12)';
      case '5':
        return 'rgba(33,150,243,0.12)';
      case '6':
        return 'rgba(63,81,181,0.12)';
      default:
        return 'transparent';
    }
  }
}
