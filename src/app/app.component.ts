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
import { MatSidenav } from '@angular/material';
import { LoadingService } from './services/loading.service';

// declare ga as a function to set and sent the events
declare let ga: Function;

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
    private cd: ChangeDetectorRef
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
        ga('set', 'page', event.urlAfterRedirects);
        ga('send', 'pageview');
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
