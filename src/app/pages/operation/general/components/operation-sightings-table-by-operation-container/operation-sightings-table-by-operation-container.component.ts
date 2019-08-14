import { Component, OnInit } from '@angular/core';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import _ from 'lodash';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { MatTableDataSource } from '@angular/material/table';
@Component({
  selector: 'app-operation-sightings-table-by-operation-container',
  templateUrl:
    './operation-sightings-table-by-operation-container.component.html',
  styleUrls: [
    './operation-sightings-table-by-operation-container.component.scss'
  ]
})
export class OperationSightingsTableByOperationContainerComponent
  implements OnInit {
  dataSource: MatTableDataSource<{
    operationNumber: string;
    formationNumber: string;
    sightings: IOperationSighting[];
  }> = new MatTableDataSource<{
    operationNumber: string;
    formationNumber: string;
    sightings: IOperationSighting[];
  }>([]);

  constructor(private operationRealTimeService: OperationRealTimeService) {}

  ngOnInit() {
    this.operationRealTimeService.getOperationTableData().subscribe(data => {
      console.log(data);
      this.dataSource = new MatTableDataSource<{
        operationNumber: string;
        formationNumber: string;
        sightings: IOperationSighting[];
      }>(data);
    });
  }
}
