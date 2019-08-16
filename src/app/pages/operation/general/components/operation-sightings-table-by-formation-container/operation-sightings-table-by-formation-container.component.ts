import { Component, OnInit } from '@angular/core';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { MatTableDataSource } from '@angular/material/table';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { IOperationSightingTable } from '../../interfaces/operation-sighting-table';

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
  dataSource: MatTableDataSource<
    IOperationSightingTable
  > = new MatTableDataSource<IOperationSightingTable>([]);

  displayedColumn = [
    'formationNumber',
    'operationNumber',
    'sightingTime',
    'updatedAt'
  ];
  constructor(private operationRealTimeService: OperationRealTimeService) {}

  ngOnInit() {
    this.operationRealTimeService.generateIntermidiateData().subscribe(data => {
      console.log('中間データ', data);
    });
    this.operationRealTimeService.getFormationTableData().subscribe(data => {
      console.log('編成テーブル', data);
      this.dataSource = new MatTableDataSource<IOperationSightingTable>(data);
    });
  }
}
