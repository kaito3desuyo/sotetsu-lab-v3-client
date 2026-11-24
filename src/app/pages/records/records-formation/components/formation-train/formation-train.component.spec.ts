import { TestBed } from '@angular/core/testing';
import { FormationTrainComponent } from './formation-train.component';

const cars = (n: number, livery: string | null = '10000-ynb') =>
    Array.from({ length: n }, (_, i) => ({
        vehicleNumber: `${10701 + i}`,
        livery,
    })) as never;

function create(inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({ imports: [FormationTrainComponent] });
    const fixture = TestBed.createComponent(FormationTrainComponent);
    for (const [k, v] of Object.entries(inputs)) {
        fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    return fixture;
}
const items = (f: { nativeElement: HTMLElement }) => [
    ...f.nativeElement.querySelectorAll<HTMLElement>(
        '[data-testid="formation-car"]',
    ),
];

describe('FormationTrainComponent', () => {
    it('絵の数が組成の両数と同じ', () => {
        expect(items(create({ cars: cars(8) }))).toHaveLength(8);
        expect(items(create2(10))).toHaveLength(10);
    });

    it('車両番号と号車の番号を出す', () => {
        const fixture = create({ cars: cars(3) });
        const texts = items(fixture).map((e) =>
            [...e.querySelectorAll('li > span')].map((span) =>
                span.textContent?.trim(),
            ),
        );
        expect(texts).toEqual([
            ['10701', '1'],
            ['10702', '2'],
            ['10703', '3'],
        ]);
    });

    it('showCarNumber が false なら号車を出さない', () => {
        const fixture = create({ cars: cars(2), showCarNumber: false });
        expect(items(fixture)[0].textContent?.trim()).toBe('10701');
    });

    it('livery が null の車両だけ灰色になる', () => {
        const mixed = [
            { vehicleNumber: '1', livery: '10000-ynb' },
            { vehicleNumber: '2', livery: null },
            { vehicleNumber: '3', livery: '10000-ynb' },
        ];
        const fixture = create({ cars: mixed });
        const fills = items(fixture).map((e) =>
            e.querySelector('svg > path')?.getAttribute('fill'),
        );
        expect(fills).toEqual(['#16204a', '#b8bdc4', '#16204a']);
    });

    it('同じ編成でも車両ごとに塗装を替えて描く', () => {
        const mixed = [
            { vehicleNumber: '1', livery: '10000-ynb' },
            { vehicleNumber: '2', livery: '10000-group' },
        ];
        const fixture = create({ cars: mixed });
        const fills = items(fixture).map((e) =>
            e.querySelector('svg > path')?.getAttribute('fill'),
        );
        expect(fills[0]).not.toBe(fills[1]);
    });

    it('強調する車両番号に印が付く', () => {
        const fixture = create({
            cars: cars(3),
            highlight: new Set(['10702']),
        });
        const changed = items(fixture).map(
            (e) =>
                e
                    .querySelector('[data-testid="vehicle-number"]')
                    ?.getAttribute('data-changed') === 'true',
        );
        expect(changed).toEqual([false, true, false]);
    });

    it('絵は読み上げない（aria-hidden）', () => {
        const fixture = create({ cars: cars(1) });
        expect(
            items(fixture)[0].querySelector('svg')?.getAttribute('aria-hidden'),
        ).toBe('true');
    });

    it('絵ごとに clipPath の id が重ならない', () => {
        const fixture = create({ cars: cars(4) });
        const ids = [...fixture.nativeElement.querySelectorAll('clipPath')].map(
            (e: Element) => e.getAttribute('id'),
        );
        expect(new Set(ids).size).toBe(4);
        const used = [
            ...fixture.nativeElement.querySelectorAll('g[clip-path]'),
        ].map((e: Element) => e.getAttribute('clip-path'));
        expect(used).toEqual(ids.map((id) => `url(#${id})`));
    });
});

function create2(n: number) {
    TestBed.resetTestingModule();
    return create({ cars: cars(n) });
}
