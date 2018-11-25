import { Component, OnInit, AfterContentChecked } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Station } from 'src/app/interfaces/station';
import { FormBuilder, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { directiveDef } from '@angular/core/src/view';

@Component({
  selector: 'app-add-timetable',
  templateUrl: './add-timetable.component.html',
  styleUrls: ['./add-timetable.component.css']
})
export class AddTimetableComponent implements OnInit, AfterContentChecked {
  stations: Station[];

  sendDataSet = this.fb.group({
    tripNumber: [''],
    operationNumber: [''],
    stations: this.fb.array([])
  });

  direction = this.route.snapshot.paramMap.get('direction');

  get stationsCtl(): FormArray {
    return this.sendDataSet.get('stations') as FormArray;
  }

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.getStations();
  }

  ngAfterContentChecked(): void {
    // Called after every check of the component's or directive's content.
    // Add 'implements AfterContentChecked' to the class.
    // console.log(this.sendDataSet);
  }

  getStations() {
    this.apiService.getStations(this.direction).subscribe(stations => {
      this.stations = stations;
      const stationFormControls = this.stations.map((station, index) =>
        this.fb.group({
          isAllowArrivalTime: this.checkArrivalTime(station.station_name),
          isAllowDepartureTime: this.checkDepartureTime(station.station_name),
          station_id: station.id,
          stop_id: [''],
          arrivalTime: [
            {
              value: '',
              disabled: !this.checkArrivalTime(station.station_name)
            }
          ],
          departureTime: [
            {
              value: '',
              disabled: !this.checkDepartureTime(station.station_name)
            }
          ]
        })
      );
      const timetableArray = this.fb.array(stationFormControls);
      this.sendDataSet.setControl('stations', timetableArray);

      this.checkIsAllowArrivalTime();
      this.checkIsAllowDepartureTime();
    });
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

  checkIsAllowArrivalTime() {
    this.stationsCtl.controls.forEach((element, index) => {
      if (this.direction === 'down') {
        if (index === 0) {
          element.get('isAllowArrivalTime').disable();
        }
      }
      if (this.direction === 'up') {
        if (index === 0 || index === 1 || index === 9) {
          element.get('isAllowArrivalTime').disable();
        }
      }
    });
  }

  checkArrivalTime(index) {
    if (this.direction === 'down') {
      if (index === '二俣川') {
        return true;
      }
      if (index === '湘南台') {
        return true;
      }
      if (index === '海老名') {
        return true;
      }
      if (index === '厚木') {
        return true;
      }
    }

    if (this.direction === 'up') {
      if (index === '二俣川') {
        return true;
      }
      if (index === '横浜') {
        return true;
      }
    }

    return false;
  }

  checkIsAllowDepartureTime() {
    this.stationsCtl.controls.forEach((element, index) => {
      if (this.direction === 'down') {
        if (index === 16 || index === 24 || index === 25) {
          element.get('isAllowDepartureTime').disable();
        }
      }
      if (this.direction === 'up') {
        if (index === 25) {
          element.get('isAllowDepartureTime').disable();
        }
      }
    });
  }

  checkDepartureTime(index) {
    if (this.direction === 'down') {
      if (index === '湘南台') {
        return false;
      }
      if (index === '海老名') {
        return false;
      }
      if (index === '厚木') {
        return false;
      }
    }

    if (this.direction === 'up') {
      if (index === '横浜') {
        return false;
      }
    }

    return true;
  }
}
