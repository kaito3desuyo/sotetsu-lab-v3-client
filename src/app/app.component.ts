import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { BaseComponent } from './general/classes/base-component';
import { AppUpdateService } from './general/services/app-update.service';
import { GoogleAnalyticsService } from './general/services/google-analytics.service';
import { CurrentParamsService } from './general/models/current-params/current-params.service';
import moment from 'moment';
import { CalendersService } from './general/models/calenders/state/calenders.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends BaseComponent {
  constructor(
    private title: Title,
    private route: ActivatedRoute,
    private router: Router,
    private gaService: GoogleAnalyticsService,
    private appUpdateService: AppUpdateService,
    private calendersService: CalendersService,
    private currentParamsService: CurrentParamsService
  ) {
    super();
    this.subscription = this.route.data.subscribe((data: { title: string }) => {
      this.title.setTitle(
        `${data.title ? data.title + ' - ' : ''}Sotetsu Lab. v3`
      );
    });
    this.subscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.gaService.sendPageView(event.urlAfterRedirects);
      }
    });
    this.subscription = this.calendersService
      .checkHoliday(moment().subtract(moment().hour() < 4 ? 1 : 0))
      .subscribe(data => {
        this.calendersService.setWeekdayOrHoliday(data);
      });
  }
}
