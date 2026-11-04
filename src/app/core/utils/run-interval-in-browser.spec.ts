import {
    ChangeDetectionStrategy,
    Component,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { runIntervalInBrowser } from './run-interval-in-browser';

@Component({
    selector: 'app-host',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
    ticks = 0;

    constructor() {
        runIntervalInBrowser(1000, () => {
            this.ticks++;
        });
    }
}

function render(platformId: 'browser' | 'server') {
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
}

@Component({
    selector: 'app-signal-host',
    template: '{{ count() }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class SignalHostComponent {
    readonly count = signal(0);

    constructor() {
        runIntervalInBrowser(1000, () => this.count.update((n) => n + 1));
    }
}

describe('runIntervalInBrowser', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('ブラウザでは描画の後に張り、間隔ごとに呼ぶ', () => {
        const fixture = render('browser');

        jest.advanceTimersByTime(3000);

        expect(fixture.componentInstance.ticks).toBe(3);
    });

    it('部品が壊れたら止まる', () => {
        const fixture = render('browser');
        jest.advanceTimersByTime(1000);
        fixture.destroy();

        jest.advanceTimersByTime(3000);

        expect(fixture.componentInstance.ticks).toBe(1);
    });

    it('サーバーでは張らない', () => {
        const fixture = render('server');

        jest.advanceTimersByTime(3000);

        expect(fixture.componentInstance.ticks).toBe(0);
    });

    it('tick が signal を書くと、変更検知を手で呼ばなくても表示が変わる', async () => {
        TestBed.configureTestingModule({
            imports: [SignalHostComponent],
            providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
        });
        const fixture = TestBed.createComponent(SignalHostComponent);
        fixture.detectChanges();
        TestBed.tick();

        // 3 回目の tick（3000ms）が予約した描き直しも、偽のタイマーの上で流しきる
        jest.advanceTimersByTime(3100);
        await fixture.whenStable();

        expect(fixture.nativeElement).toHaveTextContent('3');
    });
});
