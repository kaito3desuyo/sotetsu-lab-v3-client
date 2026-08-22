import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CollapsiblePanelComponent } from './collapsible-panel.component';

@Component({
    template: `
        <app-collapsible-panel label="表示設定" [summary]="summary">
            <p class="projected">中身</p>
        </app-collapsible-panel>
    `,
    imports: [CollapsiblePanelComponent],
})
class HostComponent {
    summary = '本線 / 7:00〜8:00';
}

function mockMatchMedia(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockReturnValue({ matches }),
    });
}

describe('CollapsiblePanelComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    /**
     * @param matchesDesktop sm 以上の幅として matchMedia を偽装するか。
     *   既定の開閉状態はビューポート幅に依存しないため、この値によって
     *   初期状態が変わらないことを検証する目的で残している。
     */
    async function setup(matchesDesktop: boolean): Promise<void> {
        mockMatchMedia(matchesDesktop);
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    }

    function panel(): CollapsiblePanelComponent {
        return fixture.debugElement.query(
            By.directive(CollapsiblePanelComponent),
        ).componentInstance;
    }

    function contentEl(): HTMLElement {
        return fixture.nativeElement.querySelector(
            '[data-testid="collapsible-panel-content"]',
        );
    }

    function summaryEl(): HTMLElement | null {
        return fixture.nativeElement.querySelector(
            '[data-testid="collapsible-panel-summary"]',
        );
    }

    function headerButton(): HTMLButtonElement {
        return fixture.nativeElement.querySelector('button');
    }

    // docs/design.md「App 共通骨格」の②。操作部が本体をフォールド外へ押し出す
    // 問題（audit C1）への対処として、既定はビューポート幅によらず折り畳み。
    it.each([
        ['デスクトップ（sm 以上）', true],
        ['モバイル（sm 未満）', false],
    ])('%s でも既定で折り畳まれる', async (_label, matchesDesktop) => {
        await setup(matchesDesktop as boolean);
        expect(panel().expanded()).toBe(false);
        expect(contentEl().classList).toContain('tw-hidden');
    });

    it('ヘッダークリックで開閉が切り替わる', async () => {
        await setup(true);
        expect(panel().expanded()).toBe(false);

        headerButton().click();
        fixture.detectChanges();
        expect(panel().expanded()).toBe(true);
        expect(contentEl().classList).not.toContain('tw-hidden');

        headerButton().click();
        fixture.detectChanges();
        expect(panel().expanded()).toBe(false);
        expect(contentEl().classList).toContain('tw-hidden');
    });

    it('折り畳み時のみ要約をヘッダーに表示する', async () => {
        await setup(false);
        expect(summaryEl()?.textContent).toContain('本線 / 7:00〜8:00');

        headerButton().click();
        fixture.detectChanges();
        expect(summaryEl()).toBeNull();
    });

    it('折り畳んでも投影コンテンツは DOM から破棄されない', async () => {
        await setup(false);
        expect(
            fixture.nativeElement.querySelector('.projected'),
        ).not.toBeNull();
    });

    it('aria-expanded が開閉状態に追従する', async () => {
        await setup(true);
        expect(headerButton().getAttribute('aria-expanded')).toBe('false');
        headerButton().click();
        fixture.detectChanges();
        expect(headerButton().getAttribute('aria-expanded')).toBe('true');
    });
});
