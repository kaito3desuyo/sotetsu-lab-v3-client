import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { renderInSteps } from './render-in-steps';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('renderInSteps', () => {
    let items: ReturnType<typeof signal<readonly number[]>>;
    let shown: ReturnType<typeof renderInSteps<number>>;

    /** effect を流し、画面の更新 1 回ぶん進める */
    const frame = () => {
        TestBed.tick();
        jest.advanceTimersToNextFrame();
        TestBed.tick();
    };
    const drain = () => {
        for (let i = 0; i < 20; i++) frame();
    };

    beforeEach(() => {
        jest.useFakeTimers();
        items = signal<readonly number[]>([]);
        shown = runInInjectionContext(TestBed.inject(Injector), () =>
            renderInSteps(items, 10),
        );
    });

    afterEach(() => jest.useRealTimers());

    it('長い一覧は最初に step 件だけ返し、画面の更新ごとに step 件ずつ足す', () => {
        items.set(range(25));
        TestBed.tick();
        expect(shown().length).toBe(10);

        frame();
        expect(shown().length).toBe(20);

        frame();
        expect(shown()).toEqual(range(25));
    });

    it('step 件以下ならすぐ全部を返す', () => {
        items.set(range(7));
        TestBed.tick();
        expect(shown()).toEqual(range(7));
    });

    it('絞って減らしてから外したら、また step 件から足す', () => {
        items.set(range(30));
        drain();
        expect(shown().length).toBe(30);

        items.set(range(3));
        TestBed.tick();
        expect(shown().length).toBe(3);

        items.set(range(30));
        TestBed.tick();
        expect(shown().length).toBe(10);
        drain();
        expect(shown().length).toBe(30);
    });

    it('作った時点で手元にある一覧は全部を返す（戻るボタンでスクロール位置を戻せるように）', () => {
        const ready = signal<readonly number[]>(range(30));
        const all = runInInjectionContext(TestBed.inject(Injector), () =>
            renderInSteps(ready, 10),
        );
        TestBed.tick();
        expect(all().length).toBe(30);
    });

    it('件数が同じまま中身が入れ替わったら、描いていた件数を保つ（自動更新で描き直さない）', () => {
        items.set(range(30));
        drain();

        items.set(range(30).map((n) => n + 100));
        TestBed.tick();
        expect(shown().length).toBe(30);
    });
});
