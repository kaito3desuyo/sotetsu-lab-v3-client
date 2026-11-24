import { TestBed } from '@angular/core/testing';
import { FormationPeriod } from '../../utils/formation-periods.util';
import { RecordsFormationInfoComponent } from './records-formation-info.component';

const cars = (numbers: string[], livery: string | null = '7000') =>
    numbers.map((vehicleNumber) => ({ vehicleNumber, livery })) as never;

const P_OLD: FormationPeriod = {
    startDate: null,
    endDate: '2019-04-28',
    vehicleType: '7000',
    agencyName: '相鉄',
    cars: cars([
        '7710',
        '7125',
        '7126',
        '7505',
        '7602',
        '7107',
        '7108',
        '7509',
    ]),
};
const P_MID: FormationPeriod = {
    startDate: '2019-04-29',
    endDate: '2019-05-12',
    vehicleType: '7000',
    agencyName: '相鉄',
    cars: cars([
        '7710',
        '7125',
        '7126',
        '7607',
        '7127',
        '7128',
        '7602',
        '7107',
        '7108',
        '7509',
    ]),
};
const P_NEW: FormationPeriod = {
    startDate: '2019-05-13',
    endDate: '2019-10-14',
    vehicleType: '7000',
    agencyName: '相鉄',
    cars: cars([
        '7710',
        '7125',
        '7126',
        '7505',
        '7602',
        '7107',
        '7108',
        '7509',
    ]),
};

function create(inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({
        imports: [RecordsFormationInfoComponent],
    });
    const fixture = TestBed.createComponent(RecordsFormationInfoComponent);
    for (const [k, v] of Object.entries(inputs)) {
        fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    return fixture;
}
const q = (f: { nativeElement: HTMLElement }, selector: string) =>
    f.nativeElement.querySelector<HTMLElement>(selector);

describe('RecordsFormationInfoComponent', () => {
    it('期間が 1 つなら「組み換えの履歴」を出さない', () => {
        const fixture = create({
            periods: [P_NEW],
            referenceDate: '2019-10-14',
        });
        expect(
            q(fixture, '[data-testid="info-composition"]'),
        ).toHaveTextContent('8両');
        expect(q(fixture, '[data-testid="info-history"]')).toBeNull();
        expect(fixture.nativeElement).not.toHaveTextContent('組み換えの履歴');
    });

    it('7710 の 3 期間を新しい順に出し、入れ替わった車両に強調の印を付ける', () => {
        const fixture = create({
            periods: [P_NEW, P_MID, P_OLD],
            referenceDate: '2019-10-14',
        });
        const periods = fixture.nativeElement.querySelectorAll(
            '[data-testid="history-period"]',
        );
        expect(periods).toHaveLength(3);
        expect(periods[0]).toHaveTextContent('2019/5/13〜2019/10/14');
        expect(periods[1]).toHaveTextContent('2019/4/29〜2019/5/12');
        expect(periods[1]).toHaveTextContent('10両');
        expect(periods[2]).toHaveTextContent('〜2019/4/28');
        const marked = (period: Element) =>
            [...period.querySelectorAll('[data-changed="true"]')].map((e) =>
                e.textContent?.trim(),
            );
        expect(marked(periods[0])).toEqual(['7505']);
        expect(marked(periods[1])).toEqual(['7607', '7127', '7128']);
        expect(marked(periods[2])).toEqual([]);
        expect(q(fixture, '[data-testid="info-history"]')).toHaveTextContent(
            '赤い番号は前の組成から入れ替わった車両です。',
        );
    });

    it('組成は組成を決める日に有効な期間のもの（2019/5/1 なら 10 両）', () => {
        const fixture = create({
            periods: [P_NEW, P_MID, P_OLD],
            referenceDate: '2019-05-01',
        });
        expect(
            q(fixture, '[data-testid="info-composition"]'),
        ).toHaveTextContent('10両');
    });

    it('改造の経歴は記録があるときだけ出す', () => {
        const none = create({ periods: [P_NEW], referenceDate: '2019-10-14' });
        expect(q(none, '[data-testid="info-modifications"]')).toBeNull();
    });

    it('全車両の記録は「全車」、1 両だけの記録は車両番号で出す', () => {
        const record = (extra: Record<string, unknown>) => ({
            modifiedOn: '2020-03-01',
            kind: 'renewal',
            value: null,
            description: null,
            ...extra,
        });
        const modifications: Record<string, unknown[]> = {};
        for (const car of P_NEW.cars) {
            modifications[car.vehicleNumber] = [
                record({ description: '内装更新' }),
            ];
        }
        modifications['7710'] = [
            ...modifications['7710'],
            record({ modifiedOn: '2021-06-01', kind: 'livery', value: '7000' }),
        ];
        const fixture = create({
            periods: [P_NEW],
            modifications,
            referenceDate: '2019-10-14',
        });
        const rows = [
            ...fixture.nativeElement.querySelectorAll(
                '[data-testid="modification-row"]',
            ),
        ].map((e: Element) =>
            [...e.querySelectorAll('span')].map((span) =>
                span.textContent?.trim(),
            ),
        );
        expect(rows).toEqual([
            ['2021/6/1', '塗り替え', '7000', '7710'],
            ['2020/3/1', 'リニューアル', '内装更新', '全車'],
        ]);
        expect(
            q(fixture, '[data-testid="info-modifications"]'),
        ).toHaveTextContent('改造の経歴');
    });
});
