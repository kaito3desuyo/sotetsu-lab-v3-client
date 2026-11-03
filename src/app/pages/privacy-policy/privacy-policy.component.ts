import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageMeta } from 'src/app/core/ssr/page-meta';

const PRIVACYPOLICY_DESCRIPTION =
    'Sotetsu Lab. v3 における利用者の情報の取扱いについて定めたプライバシーポリシーです。';

@Component({
    selector: 'app-privacy-policy',
    templateUrl: './privacy-policy.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyComponent {
    constructor() {
        // 取得データが無く resolver を持たない静的ページなので、library-vehicle と同じくここで題名・説明・OGP を入れる
        inject(PageMeta).set({
            title: 'プライバシーポリシー',
            description: PRIVACYPOLICY_DESCRIPTION,
            url: '/privacy-policy',
        });
    }
}
