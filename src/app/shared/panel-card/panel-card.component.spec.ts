import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    PanelCardComponent,
    providePanelCardEmbedded,
} from './panel-card.component';

@Component({
    template: `<app-panel-card heading="運用情報を検索する">
        <p class="content">中身</p>
    </app-panel-card>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PanelCardComponent],
})
class HostComponent {}

describe('PanelCardComponent', () => {
    function render(embedded: boolean): HTMLElement {
        TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: embedded ? [providePanelCardEmbedded()] : [],
        });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('単独配置では白いカードに小見出しと中身を出す', () => {
        const el = render(false);
        const section = el.querySelector('app-panel-card > section');

        expect(el.querySelector('h2')?.textContent?.trim()).toBe(
            '運用情報を検索する',
        );
        expect(section?.classList).toContain('tw-bg-white');
        expect(el.querySelector('.content')).not.toBeNull();
        expect(
            (
                el.querySelector('app-panel-card') as HTMLElement
            ).style.getPropertyValue('--panel-card-inset'),
        ).toBe('16px');
    });

    it('埋め込みでは外枠と見出しを出さず中身だけを出す', () => {
        const el = render(true);
        const section = el.querySelector('app-panel-card > section');

        expect(el.querySelector('h2')).toBeNull();
        expect(section?.classList).not.toContain('tw-bg-white');
        expect(el.querySelector('.content')).not.toBeNull();
        expect(
            (
                el.querySelector('app-panel-card') as HTMLElement
            ).style.getPropertyValue('--panel-card-inset'),
        ).toBe('24px');
    });
});
