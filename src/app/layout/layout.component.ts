import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil, tap } from 'rxjs/operators';
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
    imports: [RouterModule, HeaderComponent, SidenavComponent],
})
export class LayoutComponent implements OnDestroy {
    readonly #router = inject(Router);
    readonly #unsubscriber$ = new Subject<void>();

    isOpen = signal<boolean>(false);
    isVisibled = signal<boolean>(false);

    constructor() {
        this.#router.events
            .pipe(
                filter(
                    (ev) => !!this.isVisibled() && ev instanceof NavigationEnd,
                ),
                tap(() => {
                    this.toggle();
                }),
                takeUntil(this.#unsubscriber$.asObservable()),
            )
            .subscribe();
    }

    async toggle(): Promise<void> {
        const next = !this.isVisibled();

        if (!!next) {
            this.isVisibled.set(next);
            await wait(0);
            this.isOpen.set(next);
        } else {
            this.isOpen.set(next);
            await wait(250);
            this.isVisibled.set(next);
        }
    }

    ngOnDestroy(): void {
        this.#unsubscriber$.next();
    }
}
