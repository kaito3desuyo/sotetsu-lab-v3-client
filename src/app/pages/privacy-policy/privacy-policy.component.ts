import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TitleService } from 'src/app/core/services/title.service';

@Component({
    selector: 'app-privacy-policy',
    templateUrl: './privacy-policy.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyComponent {
    readonly #titleService = inject(TitleService);

    constructor() {
        // 取得データが無く resolver を持たない静的ページなので、
        // library-vehicle と同じくここで直接 document.title を設定する。
        this.#titleService.setTitle('プライバシーポリシー');
    }
}
