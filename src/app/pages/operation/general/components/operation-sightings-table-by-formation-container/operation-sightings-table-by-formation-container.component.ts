import { Component, OnInit } from '@angular/core';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { MatTableDataSource } from '@angular/material/table';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';

@Component({
  selector: 'app-operation-sightings-table-by-formation-container',
  templateUrl:
    './operation-sightings-table-by-formation-container.component.html',
  styleUrls: [
    './operation-sightings-table-by-formation-container.component.scss'
  ]
})
export class OperationSightingsTableByFormationContainerComponent
  implements OnInit {
  dataSource: MatTableDataSource<{
    operationNumber: string;
    formationNumber: string;
    sightingTime: string;
    updatedAt: string;
    sightings: IOperationSighting[];
  }> = new MatTableDataSource<{
    operationNumber: string;
    formationNumber: string;
    sightingTime: string;
    updatedAt: string;
    sightings: IOperationSighting[];
  }>([]);

  displayedColumn = [
    'formationNumber',
    'operationNumber',
    'sightingTime',
    'updatedAt'
  ];
  constructor(private operationRealTimeService: OperationRealTimeService) {}

  ngOnInit() {
    this.operationRealTimeService.getFormationTableData().subscribe(data => {
      console.log('編成テーブル', data);
      this.dataSource = new MatTableDataSource<{
        operationNumber: string;
        formationNumber: string;
        sightingTime: string;
        updatedAt: string;
        sightings: IOperationSighting[];
      }>(data);
    });
  }
}
