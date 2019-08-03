import {
  Component,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  ElementRef
} from '@angular/core';
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
import { AppUpdateService } from './services/app-update.service';
import { Location, PopStateEvent } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Sotetsu Lab.';
  opened: boolean;

  private lastPoppedUrl: string | undefined;
  private yScrollStack: number[] = [];
  private baseScrollOptions: ScrollToOptions = {
    left: 0,
    top: 0,
    behavior: 'smooth'
  };

  @ViewChild('sidenav', { static: true }) sidenav: MatSidenav;
  @ViewChild('scrollContainer', { static: true, read: ElementRef })
  scrollContainer: ElementRef;

  constructor(
    private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private loading: LoadingService,
    private cd: ChangeDetectorRef,
    private gaService: GoogleAnalyticsService,
    private appUpdateService: AppUpdateService
  ) {}

  ngOnInit(): void {
    this.location.subscribe((event: PopStateEvent) => {
      console.log('event');
      this.lastPoppedUrl = event.url;
    });

    this.router.events.subscribe(event => {
      console.log(this.scrollContainer);

      if (!this.scrollContainer) {
        return;
      }

      if (event instanceof NavigationStart) {
        if (event.url !== this.lastPoppedUrl) {
          this.yScrollStack.push(this.scrollContainer.nativeElement.scrollTop);
        }
        console.log('ナビゲーションスタート');
        this.loading.open();
        this.cd.detectChanges();
      }
      if (event instanceof NavigationEnd) {
        console.log('スクロール', this.lastPoppedUrl, this.yScrollStack);
        setTimeout(() => {
          if (event.url === this.lastPoppedUrl) {
            this.lastPoppedUrl = undefined;
            this.scrollContainer.nativeElement.scroll({
              ...this.baseScrollOptions,
              top: this.yScrollStack.pop()
            });
          } else {
            this.scrollContainer.nativeElement.scroll(this.baseScrollOptions);
          }
        }, 1000);
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

  onActivate(e, scrollContainer) {
    if (scrollContainer && scrollContainer.getElementRef().nativeElement) {
      scrollContainer.getElementRef().nativeElement.scrollTop = 0;
    }
  }
}
