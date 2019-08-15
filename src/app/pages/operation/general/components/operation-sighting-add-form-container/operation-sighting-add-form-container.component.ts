import { Component, OnInit, Input, Inject, Injector } from '@angular/core';
import { IOperationSightingAddForm } from '../../interfaces/operation-sighting-add-form';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
  selector: 'app-operation-sighting-add-form-container',
  templateUrl: './operation-sighting-add-form-container.component.html',
  styleUrls: ['./operation-sighting-add-form-container.component.scss']
})
export class OperationSightingAddFormContainerComponent extends BaseComponent
  implements OnInit {
  @Input() date: string;

  constructor(
    @Inject(Injector) injector: Injector,
    private operationRealTimeService: OperationRealTimeService
  ) {
    super(injector);
  }

  ngOnInit() {}

  async onReceiveSubmitSighting(
    sighting: IOperationSightingAddForm
  ): Promise<void> {
    const currentFormation = await this.operationRealTimeService.getCurrentFormationByVehicleNumber(
      null,
      sighting.vehicleNumber,
      this.date
    );

    if (!currentFormation || !currentFormation.length) {
      this.notification.open('存在しない車両番号です', 'OK');
      return;
    }
    console.log(currentFormation);
  }
}
