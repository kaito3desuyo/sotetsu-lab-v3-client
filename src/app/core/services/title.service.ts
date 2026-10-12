import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root',
})
export class TitleService {
    readonly #title = inject(Title);

    setTitle(title: string): void {
        this.#title.setTitle(`${title ? title + ' - ' : ''}Sotetsu Lab. v3`);
    }
}
