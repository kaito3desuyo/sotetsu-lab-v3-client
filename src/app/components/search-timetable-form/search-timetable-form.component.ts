import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { Station } from 'src/app/interfaces/station';

@Component({
  selector: 'app-search-timetable-form',
  templateUrl: './search-timetable-form.component.html',
  styleUrls: ['./search-timetable-form.component.css']
})
export class SearchTimetableFormComponent implements OnInit {
  selectStation = false;
  stations: Station[];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.getStations();
  }

  getStations(): void {
    this.apiService.getStations('down').subscribe(stations => {
      this.stations = stations;
      console.log(this.stations);
    });
  }
}
