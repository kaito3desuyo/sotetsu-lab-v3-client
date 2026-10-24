import { ChangeDetectionStrategy, Component, PLATFORM_ID } from '@angular/core';
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
});
