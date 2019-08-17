import { Component, OnInit } from '@angular/core';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import _ from 'lodash';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { MatTableDataSource } from '@angular/material/table';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';
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
  data: IOperationSightingTable[];
  displayedColumn = [
    'operationNumber',
    'formationNumber',
    'sightingTime',
    'updatedAt'
  ];

  constructor(private operationRealTimeService: OperationRealTimeService) {}

  ngOnInit() {
    this.operationRealTimeService.getOperationTableData().subscribe(data => {
      this.data = data;
    });
  }
}
