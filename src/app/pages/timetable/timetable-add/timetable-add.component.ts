import { Component, OnInit, Inject, Injector } from '@angular/core';
import { TitleService } from 'src/app/general/services/title.service';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
  selector: 'app-timetable-add',
  templateUrl: './timetable-add.component.html',
  styleUrls: ['./timetable-add.component.scss']
})
export class TimetableAddComponent extends BaseComponent {
  constructor(
    @Inject(Injector) injector: Injector,
    private titleService: TitleService,
    private route: ActivatedRoute
  ) {
    super(injector);
    this.subscription = this.route.data.subscribe((data: { title: string }) => {
      this.titleService.setTitle(data.title);
    });
  }
}
