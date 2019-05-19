import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-operation-table',
  templateUrl: './operation-table.component.html',
  styleUrls: ['./operation-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationTableComponent implements OnInit {
  dia: string;
  calender: any;
  stations: any[] = [];
  operations: any[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.dia = params.get('dia');
    });
    this.route.data.subscribe(data => {
      console.log(data);
      this.calender = data.calender;
      this.stations = data.stations;
      this.operations = data.operationsByCalenderId;
    });
  }

  trackByItem(index: number, value: any) {
    return value ? value.id : null;
  }
}
