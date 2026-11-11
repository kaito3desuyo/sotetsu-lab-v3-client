import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { OperationFlowFigureComponent } from './components/operation-flow-figure/operation-flow-figure.component';

const GUIDE_DESCRIPTION =
    '相鉄の運用の流れ（運用・運用番号・編成・目撃・順送り）と、Sotetsu Lab. の使い方の説明です。';

@Component({
    selector: 'app-guide',
    templateUrl: './guide.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, OperationFlowFigureComponent],
})
export class GuideComponent {
    constructor() {
        // 取得データが無い静的ページなので、免責事項と同じくここで題名・説明・OGP を入れる
        inject(PageMeta).set({
            title: '使い方',
            description: GUIDE_DESCRIPTION,
            url: '/guide',
        });
    }
}
