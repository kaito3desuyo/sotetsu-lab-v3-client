import { Component, Inject, Injector } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { BaseComponent } from './general/classes/base-component';
import { AppUpdateService } from './general/services/app-update.service';
import { GoogleAnalyticsService } from './general/services/google-analytics.service';
import { ParamsService } from './state/params';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends BaseComponent {
  constructor(
    @Inject(Injector) injector: Injector,
    private title: Title,
    private route: ActivatedRoute,
    private router: Router,
    private gaService: GoogleAnalyticsService,
    private appUpdateService: AppUpdateService,
    private paramsService: ParamsService
  ) {
    super(injector);
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
    this.subscription = this.paramsService.fetch().subscribe();
  }
}
