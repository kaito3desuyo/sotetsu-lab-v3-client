import { Component, OnInit } from '@angular/core';
import { TimetableAllLineService } from '../../services/timetable-all-line.service';
import { Observable } from 'rxjs';
import { ITimetableStation } from '../../interfaces/timetable-station';

@Component({
  selector: 'app-timetable-all-line-table-container',
  templateUrl: './timetable-all-line-table-container.component.html',
  styleUrls: ['./timetable-all-line-table-container.component.scss']
})
export class TimetableAllLineTableContainerComponent implements OnInit {
  tripDirection$: Observable<'0' | '1'>;
  stations$: Observable<ITimetableStation[]>;

  constructor(private timetableAllLineService: TimetableAllLineService) {
    this.tripDirection$ = this.timetableAllLineService.getTripDirection();
    this.stations$ = this.timetableAllLineService.getStations();
  }

  ngOnInit() {
    this.timetableAllLineService.getStations().subscribe(stations => {
      console.log('駅名', stations);
    });
  }
}
