import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    NavigationCancel,
    NavigationEnd,
    Router,
    RouterModule,
} from '@angular/router';
import { filter, tap } from 'rxjs/operators';
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
export class LayoutComponent {
    readonly #router = inject(Router);

    readonly isOpen = signal<boolean>(false);
    readonly isVisibled = signal<boolean>(false);

    constructor() {
        this.#router.events
            .pipe(
                filter(
                    (ev) =>
                        !!this.isVisibled() &&
                        (ev instanceof NavigationEnd ||
                            ev instanceof NavigationCancel),
                ),
                tap(() => {
                    this.toggle();
                }),
                takeUntilDestroyed(),
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
}
