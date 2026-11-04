import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperationRealTimeSightingCallComponent } from './operation-real-time-sighting-call.component';

describe('OperationRealTimeSightingCallComponent', () => {
    let fixture: ComponentFixture<OperationRealTimeSightingCallComponent>;

    const button = () =>
        (fixture.nativeElement as HTMLElement).querySelector('button')!;
    const text = () => button().textContent?.replace(/\s+/g, ' ').trim();

    const setup = (count: number, active: boolean) => {
        fixture = TestBed.createComponent(
            OperationRealTimeSightingCallComponent,
        );
        fixture.componentRef.setInput('count', count);
        fixture.componentRef.setInput('active', active);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeSightingCallComponent],
        }).compileComponents();
    });

    it('未選択では「目撃募集 3 ›」を白地・1px の枠で出す', () => {
        setup(3, false);

        expect(text()).toBe('目撃募集 3 ›');
        expect(button()).toHaveAttribute('type', 'button');
        expect(button()).toHaveAttribute('aria-pressed', 'false');
        expect(button()).toHaveClass(
            'tw-bg-white',
            'tw-text-ink',
            'tw-border',
            'tw-border-solid',
            'tw-border-rule-strong',
            'tw-rounded-full',
            'tw-h-8',
            'tw-font-[inherit]',
        );
        expect(button()).not.toHaveClass('tw-bg-accent-500');
    });

    it('絞っている間は、オレンジで塗って末尾を ✕ にし、aria-pressed を true にする', () => {
        setup(3, true);

        expect(text()).toBe('目撃募集 3 ✕');
        expect(button()).toHaveAttribute('aria-pressed', 'true');
        expect(button()).toHaveClass(
            'tw-bg-accent-500',
            'tw-text-accent-ink',
            'tw-border-accent-500',
            'tw-border',
        );
        expect(button()).not.toHaveClass('tw-bg-white');
        expect(button()).not.toHaveClass('tw-border-rule-strong');
    });

    it('押すと toggled を出す', () => {
        setup(3, false);
        const emitted = jest.fn();
        fixture.componentInstance.toggled.subscribe(emitted);

        button().click();

        expect(emitted).toHaveBeenCalledTimes(1);
    });
});
