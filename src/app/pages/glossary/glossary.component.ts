import {
    afterNextRender,
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, Scroll } from '@angular/router';
import { filter } from 'rxjs';
import { PageMeta } from 'src/app/core/ssr/page-meta';

const GLOSSARY_DESCRIPTION =
    'Sotetsu Lab. で使う言葉（運用・運用番号・運用群・編成・目撃・順送り・同日引き継ぎなど）の説明です。';

@Component({
    selector: 'app-glossary',
    templateUrl: './glossary.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
})
export class GlossaryComponent {
    readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

    constructor() {
        // 取得データが無い静的ページなので、免責事項と同じくここで題名・説明・OGP を入れる
        inject(PageMeta).set({
            title: '用語集',
            description: GLOSSARY_DESCRIPTION,
            url: '/glossary',
        });

        // /glossary#junokuri の見出しへ移る（M25）。アプリ全体の anchorScrolling は変えない。
        // 直接開いたとき: hydration 中は Router が Scroll イベントを出さないので、落ち着いてから移る。
        // アプリ内の遷移: Router が Scroll イベントで上端へ戻すので、その処理の後（次のタスク）で移る。
        // Router.events の購読者は、上端へ戻す処理より先に呼ばれる
        const fragment = inject(ActivatedRoute).snapshot.fragment;
        const appRef = inject(ApplicationRef);
        afterNextRender(() => {
            if (fragment) {
                void appRef.whenStable().then(() => this.#scrollTo(fragment));
            }
        });
        inject(Router)
            .events.pipe(
                filter((e): e is Scroll => e instanceof Scroll),
                takeUntilDestroyed(),
            )
            .subscribe((e) => {
                const anchor = e.anchor;
                if (anchor) {
                    setTimeout(() => this.#scrollTo(anchor));
                }
            });
    }

    #scrollTo(id: string): void {
        const target = Array.from(
            this.#host.nativeElement.querySelectorAll<HTMLElement>('h3[id]'),
        ).find((el) => el.id === id);
        target?.scrollIntoView();
    }
}
