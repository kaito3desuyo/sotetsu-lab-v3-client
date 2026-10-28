import '@testing-library/jest-dom';
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
    ControlBandCollapse,
    ControlBandComponent,
} from './control-band.component';

class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    constructor() {
        FakeResizeObserver.instances.push(this);
    }
    observe(): void {}
    disconnect(): void {}
}

class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];
    constructor() {
        FakeIntersectionObserver.instances.push(this);
    }
    observe(): void {}
    disconnect(): void {}
}

function installGlobals(): void {
    FakeResizeObserver.instances = [];
    FakeIntersectionObserver.instances = [];
    Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        value: FakeResizeObserver,
    });
    Object.defineProperty(window, 'IntersectionObserver', {
        writable: true,
        value: FakeIntersectionObserver,
    });
}

@Component({
    template: `
        @if (shown()) {
            <app-control-band
                [summary]="summary()"
                [filterActive]="filterActive()"
                [clearable]="clearable()"
                [collapse]="collapse()"
                [flush]="flush()"
                (clear)="cleared = cleared + 1"
            >
                <button type="button" class="chip">チップ</button>
            </app-control-band>
        }
        <p class="outside">本文</p>
        <div class="box">
            <span class="in-box">箱の中身</span>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ControlBandComponent],
})
class HostComponent {
    shown = signal(true);
    summary = signal('絞り込み中：東急 3/10 運用');
    filterActive = signal(true);
    clearable = signal(true);
    collapse = signal<ControlBandCollapse>('page');
    flush = signal(false);
    cleared = 0;
}

describe('ControlBandComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    const q = (id: string): HTMLElement | null =>
        fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
    const all = (id: string): number =>
        fixture.nativeElement.querySelectorAll(`[data-testid="${id}"]`).length;
    const hostEl = (): HTMLElement =>
        fixture.nativeElement.querySelector('app-control-band');
    const component = (): ControlBandComponent =>
        fixture.debugElement.query(By.directive(ControlBandComponent))
            .componentInstance;

    async function setup(
        configure?: (h: HostComponent) => void,
    ): Promise<void> {
        installGlobals();
        await TestBed.configureTestingModule({
            imports: [HostComponent, NoopAnimationsModule],
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        configure?.(host);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    function click(id: string): void {
        q(id)!.click();
        fixture.detectChanges();
    }

    function fire(el: Element | Document, event: Event): void {
        el.dispatchEvent(event);
        fixture.detectChanges();
    }

    /** 操作部が出ている（grid の行が 1fr で、押せる）か、隠れている（0fr で inert）か */
    function expectShown(shown: boolean): void {
        const content = q('control-band-content')!;
        if (shown) {
            expect(content).toHaveClass('tw-grid-rows-[1fr]');
            expect(content).not.toHaveAttribute('inert');
        } else {
            expect(content).toHaveClass('tw-grid-rows-[0fr]');
            expect(content).toHaveAttribute('inert');
        }
    }

    const offset = (): string =>
        document.documentElement.style.getPropertyValue(
            '--control-band-offset',
        );

    afterEach(() => {
        document.documentElement.style.removeProperty('--control-band-offset');
        jest.restoreAllMocks();
    });

    // 型を問わず同じ振る舞い
    describe.each<ControlBandCollapse>(['page', 'box'])('%s', (collapse) => {
        const start = (): Promise<void> =>
            setup((h) => h.collapse.set(collapse));

        it('要約の行が上、操作部が下の順。初めは畳んだ形（要約の行だけ）', async () => {
            await start();
            const band = q('control-band-band')!;
            expect(band.firstElementChild).toBe(q('control-band-bar'));
            expect(band.lastElementChild).toBe(q('control-band-content'));
            expect(q('control-band-summary')).toHaveTextContent(
                '絞り込み中：東急 3/10 運用',
            );
            expectShown(false);
            expect(q('control-band-scrim')).toBeNull();
            expect(q('control-band-toggle')).toHaveTextContent('開く');
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-expanded',
                'false',
            );
            expect(component().open()).toBe(false);
        });

        it('「開く」は操作部を要約の行の下に重ねて出す（ページの流れに入れない）。幕つき', async () => {
            await start();
            click('control-band-toggle');
            expectShown(true);
            expect(q('control-band-scrim')).toBeInTheDocument();
            expect(q('control-band-content')).toHaveClass(
                'tw-absolute',
                'tw-inset-x-0',
                'tw-top-full',
            );
            // 畳んでいる間も同じ置き方なので、開いても帯より下は動かない
            click('control-band-toggle');
            expect(q('control-band-content')).toHaveClass(
                'tw-absolute',
                'tw-top-full',
            );
            expect(all('control-band-bar')).toBe(1);
            expect(all('control-band-toggle')).toBe(1);
        });

        it('開くと「畳む」になり、押すと閉じて「開く」に戻る', async () => {
            await start();
            click('control-band-toggle');
            expect(q('control-band-toggle')).toHaveTextContent('畳む');
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-expanded',
                'true',
            );
            expect(component().open()).toBe(true);
            click('control-band-toggle');
            expectShown(false);
            expect(q('control-band-scrim')).toBeNull();
            expect(q('control-band-toggle')).toHaveTextContent('開く');
            expect(component().open()).toBe(false);
        });

        it('高さの上限は「画面 − ヘッダー − 40px」で、超えたら中でスクロールする', async () => {
            await start();
            click('control-band-toggle');
            const inner = q('control-band-content')!.firstElementChild!;
            expect(inner).toHaveClass(
                'tw-overflow-y-auto',
                'tw-max-h-[calc(100dvh_-_88px)]',
                'md:tw-max-h-[calc(100dvh_-_104px)]',
            );
        });

        it('罫線: 要約の行の下はいつも引き、操作部は開いている間だけ自分の下に引く', async () => {
            await start();
            const rule = ['tw-border-b', 'tw-border-solid', 'tw-border-rule'];
            expect(q('control-band-bar')).toHaveClass(...rule);
            expect(q('control-band-content')).not.toHaveClass('tw-border-b');
            click('control-band-toggle');
            expect(q('control-band-bar')).toHaveClass(...rule);
            expect(q('control-band-content')).toHaveClass(...rule);
            expect(q('control-band-band')).not.toHaveClass('tw-border-b');
            // 影は付けない（下の罫線だけ）
            expect(q('control-band-band')).not.toHaveClass('tw-shadow-md');
        });

        it('開く・畳むは 0fr⇄1fr で動かす。動きを減らす設定では動かさない。位置は動かさない', async () => {
            await start();
            expect(q('control-band-content')).toHaveClass(
                'tw-transition-[grid-template-rows]',
                'tw-duration-200',
                'motion-reduce:tw-transition-none',
            );
            expect(hostEl()).not.toHaveClass('tw-transition-[top]');
            expect(q('control-band-band')).not.toHaveClass(
                'tw-transition-[top]',
            );
        });

        it('帯は幕（tw-z-40）より上に重なり、展開中に操作部と「畳む」を押せる', async () => {
            await start();
            click('control-band-toggle');
            expect(q('control-band-band')).toHaveClass('tw-z-50');
            expect(q('control-band-scrim')).toHaveClass('tw-z-40');
        });

        it('幕を押すと閉じる', async () => {
            await start();
            click('control-band-toggle');
            click('control-band-scrim');
            expect(q('control-band-scrim')).toBeNull();
            expectShown(false);
        });

        it('スクロール（wheel・touchmove・スクロールのキー・scroll）では、閉じない。幕の上でも閉じない', async () => {
            await start();
            click('control-band-toggle');
            const scrim = q('control-band-scrim')!;
            const inBox = fixture.nativeElement.querySelector(
                '.in-box',
            ) as HTMLElement;
            for (const el of [scrim, inBox]) {
                fire(el, new Event('wheel', { bubbles: true }));
                fire(el, new Event('touchmove', { bubbles: true }));
                fire(el, new Event('scroll', { bubbles: true }));
                for (const key of [
                    'PageDown',
                    'PageUp',
                    'Home',
                    'End',
                    ' ',
                    'ArrowUp',
                    'ArrowDown',
                ]) {
                    fire(
                        el,
                        new KeyboardEvent('keydown', { key, bubbles: true }),
                    );
                }
            }
            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'PageDown' }),
            );
            window.dispatchEvent(new Event('scroll'));
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();
            expectShown(true);
        });

        it('畳んでいる間の箱のスクロールで、何も起きない', async () => {
            await start();
            const inBox = fixture.nativeElement.querySelector(
                '.in-box',
            ) as HTMLElement;
            fire(inBox, new Event('wheel', { bubbles: true }));
            fire(inBox, new Event('touchmove', { bubbles: true }));
            fire(
                inBox,
                new KeyboardEvent('keydown', {
                    key: 'PageDown',
                    bubbles: true,
                }),
            );
            expectShown(false);
            expect(q('control-band-toggle')).toHaveTextContent('開く');
        });

        it('チップを押しても閉じない', async () => {
            await start();
            click('control-band-toggle');
            (
                fixture.nativeElement.querySelector('.chip') as HTMLElement
            ).click();
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();
        });

        it('Esc で閉じる。帯の中の ArrowDown や、開く前の Esc では何も起きない', async () => {
            await start();
            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' }),
            );
            fixture.detectChanges();
            expectShown(false);

            click('control-band-toggle');
            (
                fixture.nativeElement.querySelector('.chip') as HTMLElement
            ).dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    bubbles: true,
                }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();

            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeNull();
        });

        it('ほかの部品が処理した Esc（mat-select の選択肢を閉じる等）では閉じない', async () => {
            await start();
            click('control-band-toggle');
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                cancelable: true,
            });
            event.preventDefault();
            document.dispatchEvent(event);
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();
        });

        it('Esc で閉じたら、開閉のボタンにフォーカスを戻す', async () => {
            await start();
            click('control-band-toggle');
            (
                fixture.nativeElement.querySelector('.chip') as HTMLElement
            ).focus();
            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' }),
            );
            fixture.detectChanges();
            expect(q('control-band-toggle')).toHaveFocus();
        });

        it('Tab で帯の外へフォーカスが出たら閉じる。帯の中・cdk の overlay・popover への移動では閉じない', async () => {
            await start();
            click('control-band-toggle');
            const chip = fixture.nativeElement.querySelector(
                '.chip',
            ) as HTMLElement;
            const focusOutTo = (next: Element | null): void => {
                chip.dispatchEvent(
                    new FocusEvent('focusout', {
                        bubbles: true,
                        relatedTarget: next,
                    }),
                );
                fixture.detectChanges();
            };
            focusOutTo(q('control-band-toggle'));
            expect(q('control-band-scrim')).toBeInTheDocument();

            // mat-select の選択肢（cdk の overlay）へ移っても閉じない
            const overlay = document.createElement('div');
            overlay.className = 'cdk-overlay-container';
            const option = document.createElement('div');
            overlay.appendChild(option);
            document.body.appendChild(overlay);
            focusOutTo(option);
            expect(q('control-band-scrim')).toBeInTheDocument();
            overlay.remove();

            // popover に出る Material のパネルへ移っても閉じない
            const popover = document.createElement('div');
            popover.setAttribute('popover', '');
            const popoverOption = document.createElement('div');
            popover.appendChild(popoverOption);
            document.body.appendChild(popover);
            focusOutTo(popoverOption);
            expect(q('control-band-scrim')).toBeInTheDocument();
            popover.remove();

            focusOutTo(fixture.nativeElement.querySelector('.outside'));
            expect(q('control-band-scrim')).toBeNull();
        });

        it('閉じているときの focusout では何も起きない', async () => {
            await start();
            const chip = fixture.nativeElement.querySelector(
                '.chip',
            ) as HTMLElement;
            chip.dispatchEvent(
                new FocusEvent('focusout', {
                    bubbles: true,
                    relatedTarget:
                        fixture.nativeElement.querySelector('.outside'),
                }),
            );
            fixture.detectChanges();
            expectShown(false);
        });

        it('開閉のボタンの aria-controls は操作部を指す', async () => {
            await start();
            const id = q('control-band-content')!.id;
            expect(id).toMatch(/^control-band-content-\d+$/);
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-controls',
                id,
            );
        });

        it('絞り込み中は縦線と［解除］を出し、［解除］で clear を出す', async () => {
            await start();
            expect(q('control-band-filter-mark')).toBeInTheDocument();
            q('control-band-clear')!.click();
            expect(host.cleared).toBe(1);
        });

        it('絞り込み中でなければ縦線も［解除］も出さない', async () => {
            await setup((h) => {
                h.collapse.set(collapse);
                h.filterActive.set(false);
            });
            expect(q('control-band-filter-mark')).toBeNull();
            expect(q('control-band-clear')).toBeNull();
        });

        it('clearable でなければ［解除］を出さない', async () => {
            await setup((h) => {
                h.collapse.set(collapse);
                h.clearable.set(false);
            });
            expect(q('control-band-filter-mark')).toBeInTheDocument();
            expect(q('control-band-clear')).toBeNull();
        });

        it('位置を測らない（ResizeObserver・IntersectionObserver を使わない）', async () => {
            await start();
            click('control-band-toggle');
            expect(FakeResizeObserver.instances).toHaveLength(0);
            expect(FakeIntersectionObserver.instances).toHaveLength(0);
        });
    });

    describe('page', () => {
        it('host は消え（display: contents）、帯の外枠が sticky でヘッダーのすぐ下（48px、md 以上は 64px）に貼り付く', async () => {
            await setup();
            expect(hostEl()).toHaveClass('tw-contents');
            expect(hostEl()).not.toHaveClass('tw-sticky');
            expect(q('control-band-band')).toHaveClass(
                'tw-sticky',
                'tw-top-12',
                'md:tw-top-16',
                'tw-z-50',
                'tw-bg-white',
            );
            // 負のマージンは貼り付く帯の外枠に付ける（host の消えた親の箱の中で貼り付くため）
            expect(q('control-band-band')).toHaveClass(
                '-tw-mx-4',
                '-tw-mt-4',
                'xl:-tw-mt-16',
            );
        });

        it('flush のときは負のマージンを付けない', async () => {
            await setup((h) => h.flush.set(true));
            expect(q('control-band-band')).toHaveClass('tw-sticky');
            expect(q('control-band-band')).not.toHaveClass('-tw-mx-4');
            expect(q('control-band-bar')).toHaveClass('tw-px-3');
        });

        it('--control-band-offset は要約の行の 40px をずっと入れておく。開閉では変わらない', async () => {
            await setup();
            expect(offset()).toBe('40px');
            click('control-band-toggle');
            expect(offset()).toBe('40px');
            click('control-band-toggle');
            expect(offset()).toBe('40px');
        });

        it('部品が消えたら変数を消す', async () => {
            await setup();
            expect(offset()).toBe('40px');
            host.shown.set(false);
            fixture.detectChanges();
            expect(offset()).toBe('');
        });
    });

    describe('box', () => {
        it('貼り付かない。host が余白を打ち消し、変数も入れない', async () => {
            await setup((h) => h.collapse.set('box'));
            expect(hostEl()).toHaveClass('tw-block', '-tw-mx-4', '-tw-mt-4');
            expect(q('control-band-band')).toHaveClass('tw-relative');
            expect(q('control-band-band')).not.toHaveClass('tw-sticky');
            expect(offset()).toBe('');
        });

        it('flush のときは host に負のマージンを付けない', async () => {
            await setup((h) => {
                h.collapse.set('box');
                h.flush.set(true);
            });
            expect(hostEl()).toHaveClass('tw-block');
            expect(hostEl()).not.toHaveClass('-tw-mx-4');
        });
    });
});
