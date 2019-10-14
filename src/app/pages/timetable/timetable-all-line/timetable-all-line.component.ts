import { Component, OnInit, Injector, Inject } from '@angular/core';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';
import { TitleService } from 'src/app/general/services/title.service';

@Component({
  selector: 'app-timetable-all-line',
  templateUrl: './timetable-all-line.component.html',
  styleUrls: ['./timetable-all-line.component.scss']
})
export class TimetableAllLineComponent extends BaseComponent {
  constructor(
    @Inject(Injector) injector: Injector,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
    super(injector);
    this.subscription = this.route.data.subscribe((data: { title: string }) => {
      this.titleService.setTitle(data.title);
    });
  }
}
