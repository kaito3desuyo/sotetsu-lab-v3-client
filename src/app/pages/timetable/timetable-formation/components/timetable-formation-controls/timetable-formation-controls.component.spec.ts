import { TestBed } from '@angular/core/testing';
import { TimetableFormationControlsComponent } from './timetable-formation-controls.component';

describe('TimetableFormationControlsComponent', () => {
    function create(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({
            imports: [TimetableFormationControlsComponent],
        });
        const fixture = TestBed.createComponent(
            TimetableFormationControlsComponent,
        );
        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }
        fixture.detectChanges();
        return fixture;
    }
    const q = (f: { nativeElement: HTMLElement }, selector: string) =>
        f.nativeElement.querySelector(selector);

    const FORMATIONS = [
        {
            formationId: 'a',
            formationNumber: '8713',
            agencyId: 's',
            vehicleType: '8000',
        },
        {
            formationId: 'b',
            formationNumber: '8714',
            agencyId: 's',
            vehicleType: '8000',
        },
        {
            formationId: 'c',
            formationNumber: '10701',
            agencyId: 's',
            vehicleType: '10000',
        },
    ];
    const AGENCIES = [{ agencyId: 's', agencyName: '相鉄' }];

    function openWith(value: string) {
        const fixture = create({
            formationNumber: null,
            formations: FORMATIONS,
            agencies: AGENCIES,
        });
        const emitted: string[] = [];
        fixture.componentInstance.formationNumberSubmit.subscribe((v) =>
            emitted.push(v),
        );
        const input = q(
            fixture,
            '[data-testid="formation-number-input"]',
        ) as HTMLInputElement;
        input.dispatchEvent(new Event('focusin'));
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        return { fixture, emitted, input };
    }
    const overlayText = (): string =>
        document.querySelector('.cdk-overlay-container')?.textContent ?? '';

    it('欄を開くと、会社と形式ごとにまとめた編成が並ぶ', () => {
        openWith('');
        const t = overlayText();
        expect(t).toContain('相鉄 8000');
        expect(t).toContain('相鉄 10000');
        expect(t).toContain('10701');
    });

    it('打った文字で候補を絞る', () => {
        openWith('871');
        const t = overlayText();
        expect(t).toContain('8714');
        expect(t).not.toContain('10701');
    });

    it('候補を選ぶと、その編成番号を出力する', () => {
        const { emitted } = openWith('871');
        const option = [
            ...document.querySelectorAll<HTMLElement>('mat-option'),
        ].find((o) => o.textContent?.includes('8714'));
        option?.click();
        expect(emitted).toEqual(['8714']);
    });

    it('候補を選ばずに Enter を押すと、打った値を出力する', () => {
        const { emitted, input } = openWith('9999');
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(emitted).toEqual(['9999']);
    });

    it('編成が見つかるまでは駅の欄を出さない', () => {
        const hidden = create({ formationNumber: '8713', showStation: false });
        expect(hidden.nativeElement.textContent).not.toContain('駅で絞る');
        TestBed.resetTestingModule();
        const shown = create({ formationNumber: '8713', showStation: true });
        expect(shown.nativeElement.textContent).toContain('駅で絞る');
    });
});
