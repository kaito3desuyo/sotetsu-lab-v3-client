import { Component, OnInit, AfterContentChecked } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Station } from 'src/app/interfaces/station';
import { FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import * as _ from 'lodash';
import { Operation } from 'src/app/interfaces/operation';
import { Calender } from 'src/app/interfaces/calender';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-timetable-editor',
  templateUrl: './timetable-editor.component.html',
  styleUrls: ['./timetable-editor.component.scss']
})
export class TimetableEditorComponent implements OnInit {
  title: string = null;

  services: any[];
  classes: any[];
  stations: Station[];
  calender: Calender;
  operations: Operation[];
  trip: any;

  sendDataSet = this.fb.group({
    tripNumber: ['', Validators.required],
    operationId: ['', Validators.required],
    tripClassId: ['', Validators.required],
    stations: this.fb.array([])
  });

  direction = this.route.snapshot.paramMap.get('direction');

  get stationsCtl(): FormArray {
    return this.sendDataSet.get('stations') as FormArray;
  }

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route.data.subscribe(
      (data: {
        title: string
        services: any[]
        stations: any[]
        calender: any
        trip?: any
      }) => {
        this.title = data.title;
        console.log(data);
        this.services = data.services;
        this.classes = this.services[0].trip_classes;
        this.stations = data.stations;
        this.calender = data.calender;
        this.operations = data.calender.operations;
        this.trip = data.trip ? data.trip : {};

        if (this.trip) {
          this.sendDataSet.get('tripNumber').setValue(this.trip.trip_number);
          this.sendDataSet.get('operationId').setValue(this.trip.operation_id);
          this.sendDataSet.get('tripClassId').setValue(this.trip.trip_class_id);
        }

        this.initializeStationTimeFormArray();
      }
    );
  }

  initializeStationTimeFormArray() {
    const stationFormControls = this.stations.map((station, index) =>
      this.fb.group({
        isAllowArrivalTime:
          this.getTimeOnEditMode(station.id, 'arrival_time') ||
          this.checkArrivalTime(station.station_name),
        isAllowDepartureTime:
          this.getTimeOnEditMode(station.id, 'departure_time') ||
          this.checkDepartureTime(station.station_name),
        station_id: station.id,
        station_name: station.station_name,
        stop_id: [''],
        arrivalTime: [
          {
            value: this.route.snapshot.paramMap.get('trip')
              ? this.getTimeOnEditMode(station.id, 'arrival_time')
              : null,
            disabled: this.getTimeOnEditMode(station.id, 'arrival_time')
              ? false
              : !this.checkArrivalTime(station.station_name)
          }
        ],
        departureTime: [
          {
            value: this.route.snapshot.paramMap.get('trip')
              ? this.getTimeOnEditMode(station.id, 'departure_time')
              : null,
            disabled: this.getTimeOnEditMode(station.id, 'departure_time')
              ? false
              : !this.checkDepartureTime(station.station_name)
          }
        ]
      })
    );
    const timetableArray = this.fb.array(stationFormControls);
    this.sendDataSet.setControl('stations', timetableArray);

    this.checkIsAllowArrivalTime();
    this.checkIsAllowDepartureTime();
  }

  onChangeAllowArrivalTime(index) {
    if (this.stationsCtl.value[index].isAllowArrivalTime) {
      this.stationsCtl.controls[index].get('arrivalTime').enable();
    } else {
      this.stationsCtl.controls[index].get('arrivalTime').disable();
    }
  }
  onChangeAllowDepartureTime(index) {
    if (this.stationsCtl.value[index].isAllowDepartureTime) {
      this.stationsCtl.controls[index].get('departureTime').enable();
    } else {
      this.stationsCtl.controls[index].get('departureTime').disable();
    }
  }

  getTimeOnEditMode(stationId: string, prop: string) {
    const result = _.find(this.trip.times, obj => {
      return obj.station_id === stationId;
    });
    if (!result) {
      return null;
    }
    return result[prop] !== null
      ? moment(result[prop], 'HH:mm:ss').format('HH:mm')
      : null;
  }

  checkIsAllowArrivalTime() {
    this.stationsCtl.controls.forEach((element, index) => {
      if (this.direction === 'down') {
        switch (element.get('station_name').value) {
          case '川越':
          case '横浜':
            element.get('isAllowArrivalTime').disable();
            break;
        }
      }
      if (this.direction === 'up') {
        switch (element.get('station_name').value) {
          case '厚木':
          case '湘南台':
          case '海老名':
            element.get('isAllowArrivalTime').disable();
            break;
        }
      }
    });
  }

  checkArrivalTime(index) {
    if (this.direction === 'down') {
      switch (index) {
        case '新宿':
        case '大宮':
        case '二俣川':
        case '湘南台':
        case '海老名':
        case '厚木':
          return true;
      }
    }

    if (this.direction === 'up') {
      switch (index) {
        case '二俣川':
        case '横浜':
        case '新宿':
        case '大宮':
        case '川越':
          return true;
      }
    }

    return false;
  }

  checkIsAllowDepartureTime() {
    this.stationsCtl.controls.forEach((element, index) => {
      if (this.direction === 'down') {
        switch (element.get('station_name').value) {
          case '湘南台':
          case '海老名':
          case '厚木':
            element.get('isAllowDepartureTime').disable();
            break;
        }
      }
      if (this.direction === 'up') {
        switch (element.get('station_name').value) {
          case '横浜':
          case '川越':
            element.get('isAllowDepartureTime').disable();
            break;
        }
      }
    });
  }

  checkDepartureTime(index) {
    if (this.direction === 'down') {
      switch (index) {
        case '湘南台':
        case '海老名':
        case '厚木':
          return false;
      }
    }

    if (this.direction === 'up') {
      switch (index) {
        case '横浜':
        case '川越':
          return false;
      }
    }

    return true;
  }

  onSubmit() {
    const times = [];

    let sequence = 1;
    this.sendDataSet.value.stations.forEach(station => {
      let departureTime = null;
      let arrivalTime = null;
      let pickUpType = null;
      let dropOffType = null;

      departureTime = moment(station.departureTime, 'HH:mm');
      arrivalTime = moment(station.arrivalTime, 'HH:mm');

      if (!station.arrivalTime && station.departureTime) {
        pickUpType = 0;
        dropOffType = 0;
        if (!departureTime.isValid()) {
          return;
        }
      } else if (station.arrivalTime && !station.departureTime) {
        pickUpType = 1;
        dropOffType = 0;
        if (!arrivalTime.isValid()) {
          return;
        }
      } else if (station.arrivalTime && station.departureTime) {
        pickUpType = 0;
        dropOffType = 0;
        if (!departureTime.isValid() && !arrivalTime.isValid()) {
          return;
        }
      } else {
        return;
      }

      times.push({
        station_id: station.station_id,
        stop_id: null,
        stop_sequence: sequence,
        pickup_type: pickUpType,
        dropoff_type: dropOffType,
        arrival_days:
          arrivalTime.hour() <= 2 ? 2 : arrivalTime.hour() > 2 ? 1 : null,
        arrival_time:
          arrivalTime.format('HH:mm:ss') !== 'Invalid date'
            ? arrivalTime.format('HH:mm:ss')
            : null,
        departure_days:
          departureTime.hour() <= 2 ? 2 : departureTime.hour() > 2 ? 1 : null,
        departure_time:
          departureTime.format('HH:mm:ss') !== 'Invalid date'
            ? departureTime.format('HH:mm:ss')
            : null
      });

      sequence++;
    });

    const sendForApiData = {
      service_id: this.calender.service_id,
      operation_id: this.sendDataSet.value.operationId,
      trip_number: this.sendDataSet.value.tripNumber,
      trip_class_id: this.sendDataSet.value.tripClassId,
      trip_name: null,
      trip_direction:
        this.route.snapshot.paramMap.get('direction') === 'up'
          ? 0
          : this.route.snapshot.paramMap.get('direction') === 'down'
          ? 1
          : null,
      block_id: this.sendDataSet.value.tripNumber,
      calender_id: this.calender.id,
      extra_calender_id: null,
      times: times
    };
    if (this.trip) {
      this.apiService
        .editTrip(this.trip.id, sendForApiData)
        .subscribe(result => {
          console.log(result);
          this.snackBar.open('編集が完了しました。', 'OK', {
            duration: 3000
          });
          this.router.navigate(['/']);
        });
    } else {
      this.apiService.addTrip(sendForApiData).subscribe(result => {
        console.log(result);
        this.snackBar.open('列車を追加しました。', 'OK', {
          duration: 3000
        });
        this.router.navigate(['/']);
      });
    }
  }
}
