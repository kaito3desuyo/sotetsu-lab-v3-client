import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TitleService } from 'src/app/core/services/title.service';

@Component({
    selector: 'app-library-vehicle',
    templateUrl: './library-vehicle.component.html',
    styleUrl: './library-vehicle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryVehicleComponent {
    readonly #titleService = inject(TitleService);

    constructor() {
        // 他ページは resolver から TitleService を呼ぶが、本ページは取得データが無く
        // resolver を持たないため document.title が既定のままだった（audit M10）。
        // 静的ページなのでここで直接設定する。
        this.#titleService.setTitle('相鉄の車両');
    }
}
