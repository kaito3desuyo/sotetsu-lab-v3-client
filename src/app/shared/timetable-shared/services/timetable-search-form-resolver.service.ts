import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { TimetableSearchFormService } from './timetable-search-form.service';

@Injectable()
export class TimetableSearchFormResolverService
  implements Resolve<Observable<void>> {
  constructor(private timetableSearchFormService: TimetableSearchFormService) {}

  resolve(): Observable<void> {
    return this.timetableSearchFormService.fetchCalendars();
  }
}
