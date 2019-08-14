import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';

@Component({
  selector: 'app-operation-sightings-table-presentational',
  templateUrl: './operation-sightings-table-presentational.component.html',
  styleUrls: ['./operation-sightings-table-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingsTablePresentationalComponent implements OnInit {
  displayedColumns: string[] = [
    'operationNumber',
    'formationNumber',
    'sightingTime',
    'updatedAt'
  ];
  @Input() dataSource: MatTableDataSource<{
    formationNumber?: string;
    operationNumber?: string;
    sightings: IOperationSighting[];
  }>;

  constructor() {}

  ngOnInit() {}
}
