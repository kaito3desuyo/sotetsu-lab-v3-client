import '@testing-library/jest-dom';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { focusMainContent, routePathKey } from './focus-main-content';

describe('focusMainContent', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it('main にフォーカスし、tabindex が無ければ -1 を付ける', () => {
        container.innerHTML = '<section><main>本文</main></section>';
        const main = container.querySelector('main') as HTMLElement;

        expect(focusMainContent(container)).toBe(true);
        expect(main).toHaveAttribute('tabindex', '-1');
        expect(main).toHaveFocus();
    });

    it('既に tabindex があれば変えない', () => {
        container.innerHTML = '<main tabindex="0">本文</main>';
        const main = container.querySelector('main') as HTMLElement;

        expect(focusMainContent(container)).toBe(true);
        expect(main).toHaveAttribute('tabindex', '0');
        expect(main).toHaveFocus();
    });

    it('スクロールさせない（preventScroll）', () => {
        container.innerHTML = '<main>本文</main>';
        const main = container.querySelector('main') as HTMLElement;
        const focus = jest.spyOn(main, 'focus');

        focusMainContent(container);

        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('main が無ければ false', () => {
        container.innerHTML = '<div>本文</div>';

        expect(focusMainContent(container)).toBe(false);
    });
});

describe('routePathKey', () => {
    let router: Router;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        router = TestBed.inject(Router);
    });

    const key = (url: string): string => routePathKey(router.parseUrl(url));

    it('matrix・query・fragment が違うだけなら同じキー', () => {
        expect(key('/operation/table;calendar_id=A')).toBe(
            key('/operation/table;calendar_id=B?x=1#top'),
        );
        expect(key('/operation/table;calendar_id=A')).toBe('operation/table');
    });

    it('path が違えば違うキー', () => {
        expect(key('/operation/table')).not.toBe(key('/operation/real-time'));
    });

    it('ルートは空文字', () => {
        expect(key('/')).toBe('');
    });
});
