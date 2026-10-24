import { DOCUMENT } from '@angular/common';
import {
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    createComponent,
    EnvironmentInjector,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterFirstRender, FirstRender } from './first-render';

@Component({
    selector: 'app-host',
    template: '{{ render(value()) }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
    readonly source = signal('ブラウザの値');
    readonly value = afterFirstRender(this.source, 'サーバーの値');
    /** 描いた値を順に残す（最初の描画で何が描かれたかを見るため） */
    readonly rendered: string[] = [];

    render(value: string): string {
        this.rendered.push(value);
        return value;
    }
}

function setup(platformId: 'browser' | 'server', serverRendered: boolean) {
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });
    const root = TestBed.inject(DOCUMENT).body;
    if (serverRendered) root.setAttribute('ng-server-context', 'ssr');
    return () => root.removeAttribute('ng-server-context');
}

describe('FirstRender', () => {
    let cleanup: () => void;
    afterEach(() => cleanup());

    it('サーバーでは済まない（サーバーの値で描く）', () => {
        cleanup = setup('server', true);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        TestBed.tick();
        fixture.detectChanges();

        expect(TestBed.inject(FirstRender).done()).toBe(false);
        expect(fixture.nativeElement).toHaveTextContent('サーバーの値');
    });

    it('サーバーの HTML を引き継ぐときは、最初の描画はサーバーの値、描いた後にブラウザの値', () => {
        cleanup = setup('browser', true);
        // TestBed.createComponent は最初の描画より前にフックを流してしまうので、
        // 起動と同じ順（作る → 最初の tick で描く → 描いた後のフック）になるよう ApplicationRef で動かす
        const host = TestBed.inject(DOCUMENT).createElement('div');
        const ref = createComponent(HostComponent, {
            environmentInjector: TestBed.inject(EnvironmentInjector),
            hostElement: host,
        });
        const appRef = TestBed.inject(ApplicationRef);
        appRef.attachView(ref.hostView);

        expect(TestBed.inject(FirstRender).done()).toBe(false);

        appRef.tick();

        expect(ref.instance.rendered[0]).toBe('サーバーの値');
        expect(TestBed.inject(FirstRender).done()).toBe(true);
        expect(host).toHaveTextContent('ブラウザの値');
    });

    it('サーバーの HTML が無い起動（Service Worker の殻・テスト）は最初からブラウザの値', () => {
        cleanup = setup('browser', false);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent('ブラウザの値');
    });
});
