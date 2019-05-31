import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import {
  Router,
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  NavigationCancel
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, map, mergeMap } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';
import { LoadingService } from './services/loading.service';
import { GoogleAnalyticsService } from './services/google-analytics.service';
import { SwUpdate } from '@angular/service-worker';
import { AppUpdateService } from './services/app-update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Sotetsu Lab.';
  opened: boolean;

  @ViewChild('sidenav') sidenav: MatSidenav;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private loading: LoadingService,
    private cd: ChangeDetectorRef,
    private gaService: GoogleAnalyticsService,
    private appUpdateService: AppUpdateService
  ) {}

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('ナビゲーションスタート');
        this.loading.open();
        this.cd.detectChanges();
      }
      if (event instanceof NavigationEnd) {
        console.log('ナビゲーションエンド');
        this.loading.close();
        this.cd.detectChanges();
        this.gaService.sendPageView(event.urlAfterRedirects);
      }
      if (event instanceof NavigationCancel) {
        console.log('ナビゲーションキャンセル');
        this.loading.close();
        this.cd.detectChanges();
      }
    });
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        filter(route => route.outlet === 'primary'),
        mergeMap(route => route.data)
      )
      .subscribe(event => {
        this.titleService.setTitle(
          event['title'] + (event['title'] ? ' - ' : '') + 'Sotetsu Lab.'
        );
        if (this.opened) {
          console.log(this.sidenav);
          this.sidenav.close();
        }
      });
  }
}
