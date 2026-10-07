import '@testing-library/jest-dom';
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
    ControlBandCollapse,
    ControlBandComponent,
} from './control-band.component';

class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    disconnected = false;
    constructor(public callback: ResizeObserverCallback) {
        FakeResizeObserver.instances.push(this);
    }
    observe(): void {}
    disconnect(): void {
        this.disconnected = true;
    }
}

class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];
    disconnected = false;
    constructor(
        public callback: IntersectionObserverCallback,
        public options?: IntersectionObserverInit,
    ) {
        FakeIntersectionObserver.instances.push(this);
    }
    observe(): void {}
    disconnect(): void {
        this.disconnected = true;
    }
}

let mediaListeners: (() => void)[] = [];
let desktop = false;

function installGlobals(): void {
    FakeResizeObserver.instances = [];
    FakeIntersectionObserver.instances = [];
    mediaListeners = [];
    desktop = false;
    Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        value: FakeResizeObserver,
    });
    Object.defineProperty(window, 'IntersectionObserver', {
        writable: true,
        value: FakeIntersectionObserver,
    });
    Object.defineProperty(window, 'scrollY', {
        configurable: true,
        writable: true,
        value: 0,
    });
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(() => ({
            get matches() {
                return desktop;
            },
            addEventListener: (_: string, fn: () => void) =>
                mediaListeners.push(fn),
            removeEventListener: jest.fn(),
        })),
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
                [(collapsed)]="collapsed"
                (clear)="cleared = cleared + 1"
            >
                <button type="button" class="chip">チップ</button>
            </app-control-band>
        }
        <p class="outside">本文</p>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ControlBandComponent],
})
class HostComponent {
    shown = signal(true);
    summary = signal('絞り込み中：東急 3/10 運用');
    filterActive = signal(true);
    clearable = signal(true);
    collapse = signal<ControlBandCollapse>('scroll');
    collapsed = false;
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
        const el = fixture.nativeElement.querySelector(
            'app-control-band',
        ) as HTMLElement | null;
        if (el) {
            Object.defineProperty(el, 'offsetHeight', {
                configurable: true,
                value: 250,
            });
        }
        if (host.collapse() === 'scroll') measure();
    }

    /** host の高さが変わった（測り直した） */
    function measure(): void {
        const list = FakeResizeObserver.instances;
        const ro = list[list.length - 1];
        ro?.callback([], ro as unknown as ResizeObserver);
        fixture.detectChanges();
    }

    /** 操作部がヘッダーの下に隠れた（true）／見えた（false） */
    function formHidden(hidden: boolean): void {
        const list = FakeIntersectionObserver.instances;
        const io = list[list.length - 1];
        io.callback(
            [{ isIntersecting: !hidden } as IntersectionObserverEntry],
            io as unknown as IntersectionObserver,
        );
        fixture.detectChanges();
    }

    /** スクロールして操作部が隠れた所で「開く」 */
    function openBand(): void {
        formHidden(true);
        q('control-band-toggle')!.click();
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

    function click(id: string): void {
        q(id)!.click();
        fixture.detectChanges();
    }

    const offset = (): string =>
        document.documentElement.style.getPropertyValue(
            '--control-band-offset',
        );

    afterEach(() => {
        document.documentElement.style.removeProperty('--control-band-offset');
        jest.restoreAllMocks();
    });

    describe('scroll', () => {
        it('要約の行を初めから操作部の下に出し、host の top は「ヘッダー + 40 + 罫線 1 − 帯の高さ」', async () => {
            await setup();
            expect(hostEl()).toHaveClass('tw-sticky');
            expect(hostEl()).toHaveStyle({ top: '-161px' });
            expect(q('control-band-summary')).toHaveTextContent(
                '絞り込み中：東急 3/10 運用',
            );
            const band = q('control-band-band')!;
            expect(band.lastElementChild).toBe(q('control-band-bar'));
            expect(band.firstElementChild).toBe(q('control-band-content'));
        });

        it('操作部が見えているかを、ヘッダーの高さを差し引いて見る', async () => {
            await setup();
            const io = FakeIntersectionObserver.instances[0];
            expect(io.options?.rootMargin).toBe('-49px 0px 0px 0px');
            desktop = true;
            mediaListeners.forEach((fn) => fn());
            const list = FakeIntersectionObserver.instances;
            expect(io.disconnected).toBe(true);
            expect(list[list.length - 1].options?.rootMargin).toBe(
                '-65px 0px 0px 0px',
            );
        });

        it('一番上（操作部が見えている）では「畳む」で、その場で操作部を隠す', async () => {
            await setup();
            expect(q('control-band-toggle')).toHaveTextContent('畳む');
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-expanded',
                'true',
            );
            click('control-band-toggle');
            expect(host.collapsed).toBe(true);
            expectShown(false);
            expect(q('control-band-scrim')).toBeNull();
            expect(q('control-band-toggle')).toHaveTextContent('開く');
            // 帯が要約の行だけになると、ヘッダーのすぐ下に止まる
            Object.defineProperty(hostEl(), 'offsetHeight', {
                configurable: true,
                value: 41,
            });
            measure();
            expect(hostEl()).toHaveStyle({ top: '48px' });
        });

        it('畳んだまま一番上で「開く」と、重ねずにその場で広げる', async () => {
            await setup();
            click('control-band-toggle');
            formHidden(true); // 隠した操作部は見えない
            click('control-band-toggle');
            expect(host.collapsed).toBe(false);
            expect(q('control-band-scrim')).toBeNull();
            expectShown(true);
        });

        it('畳んでスクロールした後の「開く」は重ねて出し、閉じると畳んだ状態に戻る', async () => {
            await setup();
            click('control-band-toggle');
            formHidden(true);
            window.scrollY = 300;
            click('control-band-toggle');
            expect(q('control-band-scrim')).toBeInTheDocument();
            expectShown(true);
            // 帯の高さを変えず、要約の行の下に落として出す
            expect(q('control-band-content')).toHaveClass(
                'tw-absolute',
                'tw-top-full',
            );
            expect(q('control-band-toggle')).toHaveTextContent('畳む');
            click('control-band-toggle');
            expect(host.collapsed).toBe(true);
            expectShown(false);
            expect(q('control-band-toggle')).toHaveTextContent('開く');
        });

        it('開く・畳むは動かす（高さは grid の行、重ねるときは top）。動きを減らす設定では動かさない', async () => {
            await setup();
            expect(q('control-band-content')).toHaveClass(
                'tw-transition-[grid-template-rows]',
                'motion-reduce:tw-transition-none',
            );
            expect(hostEl()).toHaveClass(
                'tw-transition-[top]',
                'motion-reduce:tw-transition-none',
            );
        });

        it('その場で畳む動きの間は帯の中で縮め、終わったら要約の行の下に移す', async () => {
            await setup();
            jest.useFakeTimers();
            try {
                click('control-band-toggle');
                expect(q('control-band-content')).not.toHaveClass(
                    'tw-absolute',
                );
                jest.advanceTimersByTime(300);
                fixture.detectChanges();
                expect(q('control-band-content')).toHaveClass(
                    'tw-absolute',
                    'tw-top-full',
                );
                // 一番上で広げるときも、帯の中に戻してから伸ばす
                click('control-band-toggle');
                expect(q('control-band-content')).not.toHaveClass(
                    'tw-absolute',
                );
                expectShown(true);
            } finally {
                jest.useRealTimers();
            }
        });

        it('操作部がヘッダーの下に隠れたら、ボタンは「開く」', async () => {
            await setup();
            formHidden(true);
            expect(q('control-band-toggle')).toHaveTextContent('開く');
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-expanded',
                'false',
            );
        });

        it('要約の行はいつも 40px 残るので、変数はずっと 40px', async () => {
            await setup();
            expect(offset()).toBe('40px');
            window.dispatchEvent(new Event('scroll'));
            fixture.detectChanges();
            expect(offset()).toBe('40px');
        });

        it('影は付けない（下の罫線だけ）', async () => {
            await setup();
            expect(q('control-band-band')).not.toHaveClass('tw-shadow-md');
            expect(q('control-band-band')).toHaveClass(
                'tw-border-b',
                'tw-border-solid',
            );
        });

        it('768px をまたぐと top が -145px になる', async () => {
            await setup();
            desktop = true;
            mediaListeners.forEach((fn) => fn());
            fixture.detectChanges();
            expect(hostEl()).toHaveStyle({ top: '-145px' });
        });

        it('帯の高さが変わったら top を測り直す', async () => {
            await setup();
            Object.defineProperty(hostEl(), 'offsetHeight', {
                configurable: true,
                value: 300,
            });
            measure();
            expect(hostEl()).toHaveStyle({ top: '-211px' });
        });

        it('「開く」で全部降ろしてページに重ね、要約の行は 1 つのまま「畳む」になる', async () => {
            await setup();
            openBand();
            expect(hostEl()).toHaveStyle({ top: '48px' });
            expect(q('control-band-scrim')).toBeInTheDocument();
            expect(q('control-band-band')).not.toHaveClass('tw-shadow-md');
            expect(q('control-band-content')!.firstElementChild).toHaveClass(
                'tw-overflow-y-auto',
            );
            // 畳んでいなければ帯ごと降ろす（落とさない）
            expect(q('control-band-content')).not.toHaveClass('tw-absolute');
            expect(all('control-band-bar')).toBe(1);
            expect(all('control-band-toggle')).toBe(1);
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-expanded',
                'true',
            );
            expect(q('control-band-toggle')).toHaveTextContent('畳む');
            expect(offset()).toBe('40px');
        });

        it('帯は幕（tw-z-40）より上に重なり、展開中に操作部と「畳む」を押せる', async () => {
            await setup();
            openBand();
            expect(q('control-band-band')).toHaveClass('tw-z-50');
            expect(q('control-band-scrim')).toHaveClass('tw-z-40');
        });

        it('重ねたときの「畳む」で元に戻る', async () => {
            await setup();
            openBand();
            click('control-band-toggle');
            expect(q('control-band-scrim')).toBeNull();
            expect(hostEl()).toHaveStyle({ top: '-161px' });
            expect(q('control-band-band')).not.toHaveClass('tw-shadow-md');
            expect(q('control-band-toggle')).toHaveTextContent('開く');
        });

        it('展開中に scroll イベントが来ても閉じない。チップを押しても閉じない', async () => {
            await setup();
            openBand();
            window.dispatchEvent(new Event('scroll'));
            fixture.detectChanges();
            (
                fixture.nativeElement.querySelector('.chip') as HTMLElement
            ).click();
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();
        });

        it.each([
            ['幕を押す', (el: HTMLElement) => el.click()],
            [
                '幕の上で wheel',
                (el: HTMLElement) => el.dispatchEvent(new Event('wheel')),
            ],
            [
                '幕の上で touchmove',
                (el: HTMLElement) => el.dispatchEvent(new Event('touchmove')),
            ],
        ])('%s と閉じる', async (_, act) => {
            await setup();
            openBand();
            act(q('control-band-scrim')!);
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeNull();
            expect(hostEl()).toHaveStyle({ top: '-161px' });
        });

        it('Esc と帯の外の PageDown で閉じる。帯の中の ArrowDown では閉じない', async () => {
            await setup();
            openBand();
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
                new KeyboardEvent('keydown', { key: 'PageDown' }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeNull();

            openBand();
            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeNull();
        });

        it('ほかの部品が処理した Esc（mat-select の選択肢を閉じる等）では閉じない', async () => {
            await setup();
            openBand();
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
            await setup();
            openBand();
            (
                fixture.nativeElement.querySelector('.chip') as HTMLElement
            ).focus();
            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' }),
            );
            fixture.detectChanges();
            expect(q('control-band-toggle')).toHaveFocus();
        });

        it('Tab で帯の外へフォーカスが出たら閉じる。帯の中での移動では閉じない', async () => {
            await setup();
            openBand();
            const chip = fixture.nativeElement.querySelector(
                '.chip',
            ) as HTMLElement;
            chip.dispatchEvent(
                new FocusEvent('focusout', {
                    bubbles: true,
                    relatedTarget: q('control-band-toggle'),
                }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();

            // mat-select の選択肢（cdk の overlay）へ移っても閉じない
            const overlay = document.createElement('div');
            overlay.className = 'cdk-overlay-container';
            const option = document.createElement('div');
            overlay.appendChild(option);
            document.body.appendChild(overlay);
            chip.dispatchEvent(
                new FocusEvent('focusout', {
                    bubbles: true,
                    relatedTarget: option,
                }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeInTheDocument();
            overlay.remove();

            chip.dispatchEvent(
                new FocusEvent('focusout', {
                    bubbles: true,
                    relatedTarget:
                        fixture.nativeElement.querySelector('.outside'),
                }),
            );
            fixture.detectChanges();
            expect(q('control-band-scrim')).toBeNull();
        });

        it('開閉のボタンの aria-controls は操作部を指す', async () => {
            await setup();
            const id = q('control-band-content')!.id;
            expect(id).toMatch(/^control-band-content-\d+$/);
            expect(q('control-band-toggle')).toHaveAttribute(
                'aria-controls',
                id,
            );
        });

        it('絞り込み中は縦線と［解除］を出し、［解除］で clear を出す', async () => {
            await setup();
            expect(q('control-band-filter-mark')).toBeInTheDocument();
            q('control-band-clear')!.click();
            expect(host.cleared).toBe(1);
        });

        it('絞り込み中でなければ縦線も［解除］も出さない', async () => {
            await setup((h) => h.filterActive.set(false));
            expect(q('control-band-filter-mark')).toBeNull();
            expect(q('control-band-clear')).toBeNull();
        });

        it('clearable でなければ［解除］を出さない', async () => {
            await setup((h) => h.clearable.set(false));
            expect(q('control-band-filter-mark')).toBeInTheDocument();
            expect(q('control-band-clear')).toBeNull();
        });

        it('部品が消えたら変数を消し、観測をやめる', async () => {
            await setup();
            expect(offset()).toBe('40px');
            host.shown.set(false);
            fixture.detectChanges();
            expect(offset()).toBe('');
            expect(FakeResizeObserver.instances[0].disconnected).toBe(true);
            expect(FakeIntersectionObserver.instances[0].disconnected).toBe(
                true,
            );
        });

        it('ResizeObserver が無い環境では top を付けない', async () => {
            installGlobals();
            Object.defineProperty(window, 'ResizeObserver', {
                writable: true,
                value: undefined,
            });
            await TestBed.configureTestingModule({
                imports: [HostComponent, NoopAnimationsModule],
            }).compileComponents();
            fixture = TestBed.createComponent(HostComponent);
            fixture.detectChanges();
            expect(getComputedStyle(hostEl()).top).toBe('');
        });
    });

    describe('manual', () => {
        it('host は tw-sticky を持たない。観測せず、変数も使わない', async () => {
            await setup((h) => h.collapse.set('manual'));
            expect(FakeResizeObserver.instances).toHaveLength(0);
            expect(FakeIntersectionObserver.instances).toHaveLength(0);
            expect(offset()).toBe('');
            expect(hostEl()).not.toHaveClass('tw-sticky');
        });

        it('要約の行を初めから出し、その「畳む」で操作部を隠して collapsed を書き戻す。「開く」で戻る', async () => {
            await setup((h) => h.collapse.set('manual'));
            expect(q('control-band-bar')).toBeInTheDocument();
            expect(q('control-band-toggle')).toHaveTextContent('畳む');
            expectShown(true);
            q('control-band-toggle')!.click();
            fixture.detectChanges();
            expect(host.collapsed).toBe(true);
            expectShown(false);
            expect(q('control-band-toggle')).toHaveTextContent('開く');
            expect(q('control-band-scrim')).toBeNull();

            q('control-band-toggle')!.click();
            fixture.detectChanges();
            expect(host.collapsed).toBe(false);
            expectShown(true);
        });

        it('collapsed=true で始めたら畳んだまま出る', async () => {
            await setup((h) => {
                h.collapse.set('manual');
                h.collapsed = true;
            });
            expect(q('control-band-bar')).toBeInTheDocument();
            expectShown(false);
        });
    });
});
