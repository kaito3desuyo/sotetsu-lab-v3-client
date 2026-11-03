import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageMeta } from 'src/app/core/ssr/page-meta';

const DISCLAIMER_DESCRIPTION =
    'Sotetsu Lab. v3 の利用にあたっての免責事項です。';

@Component({
    selector: 'app-disclaimer',
    templateUrl: './disclaimer.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisclaimerComponent {
    constructor() {
        // 取得データが無く resolver を持たない静的ページなので、library-vehicle と同じくここで題名・説明・OGP を入れる
        inject(PageMeta).set({
            title: '免責事項',
            description: DISCLAIMER_DESCRIPTION,
            url: '/disclaimer',
        });
    }
}
