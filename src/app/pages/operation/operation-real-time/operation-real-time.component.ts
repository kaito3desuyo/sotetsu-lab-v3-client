import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { OperationRealTimeService } from '../general/services/operation-real-time.service';

@Component({
  selector: 'app-operation-real-time',
  templateUrl: './operation-real-time.component.html',
  styleUrls: ['./operation-real-time.component.scss']
})
export class OperationRealTimeComponent extends BaseComponent {
  constructor(
    private route: ActivatedRoute,
    private operationRealTimeService: OperationRealTimeService
  ) {
    super();
    this.subscription = this.route.data.subscribe(
      (data: {
        operationNumbers: { operationNumber: string }[];
        sightings: IOperationSighting[];
      }) => {
        this.operationRealTimeService.setOperationNumbers(
          data.operationNumbers
        );
        this.operationRealTimeService.setSightings(data.sightings);
      }
    );
  }
}
