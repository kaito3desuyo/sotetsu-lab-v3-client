import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PageMeta } from 'src/app/core/ssr/page-meta';

const LIBRARY_VEHICLE_DESCRIPTION =
    '相鉄の車両の形式ごとの解説。編成・製造・装備の移り変わりを載せています。';

@Component({
    selector: 'app-library-vehicle',
    templateUrl: './library-vehicle.component.html',
    styleUrl: './library-vehicle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryVehicleComponent {
    constructor() {
        // 取得データが無く resolver を持たないページなので、ここで題名・説明・OGP を入れる（audit M10）
        inject(PageMeta).set({
            title: '相鉄の車両',
            description: LIBRARY_VEHICLE_DESCRIPTION,
            url: '/library/vehicle',
        });
    }
}
