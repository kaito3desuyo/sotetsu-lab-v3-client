import { RxIf } from '@rx-angular/template/if';
import { Component, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, last, take, takeUntil, tap } from 'rxjs/operators';
import { wait } from '../core/utils/wait';
import { layoutAnimations } from './animations/layout.animation';
import { HeaderComponent } from './components/header/header.component';
import { SidenavComponent } from './components/sidenav/sidenav.component';

@Component({
    standalone: true,
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
    animations: layoutAnimations,
    imports: [RouterModule, RxIf, HeaderComponent, SidenavComponent],
})
export class LayoutComponent implements OnDestroy {
    private readonly router = inject(Router);
    private readonly _unsubscriber$ = new Subject<void>();

    isOpen = false;
    isVisibled = false;
    visibled$ = new Subject<boolean>();

    constructor() {
        this.router.events
            .pipe(
                filter((ev) => !!this.isOpen && ev instanceof NavigationEnd),
                tap(() => {
                    this.toggle();
                }),
                takeUntil(this._unsubscriber$.asObservable()),
            )
            .subscribe();
    }

    async toggle(): Promise<void> {
        const next = !this.isOpen;

        if (!!next) {
            this.isVisibled = true;
            await this.visibled$
                .pipe(
                    filter((bool) => !!bool),
                    take(1),
                    last(),
                )
                .toPromise();
            this.isOpen = next;
        } else {
            this.isOpen = next;
            await wait(250);
            this.isVisibled = false;
        }
    }

    ngOnDestroy(): void {
        this._unsubscriber$.next();
    }
}
