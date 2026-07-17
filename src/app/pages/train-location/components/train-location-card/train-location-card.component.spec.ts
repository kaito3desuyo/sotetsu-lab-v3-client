import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainLocationCard } from '../../interfaces/train-location-card.interface';
import { TrainLocationCardComponent } from './train-location-card.component';

function card(overrides: Partial<TrainLocationCard> = {}): TrainLocationCard {
    return {
        tripId: 't1',
        tripNumber: '1234',
        tripClassName: '各停',
        tripClassColor: '#8a8a8a',
        destinationName: '横浜',
        direction: 'inbound',
        detailLink: ['/timetable', 'all-line', {}],
        ...overrides,
    };
}

describe('TrainLocationCardComponent', () => {
    let component: TrainLocationCardComponent;
    let fixture: ComponentFixture<TrainLocationCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationCardComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainLocationCardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.componentRef.setInput('card', card());
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('status="stopped" のとき「停車中」を表示し、進行方向矢印は表示しない（モック09準拠）', () => {
        fixture.componentRef.setInput('card', card());
        fixture.componentRef.setInput('status', 'stopped');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('停車中');
        expect(fixture.nativeElement.textContent).not.toContain('▲');
        expect(fixture.nativeElement.textContent).not.toContain('▼');
    });

    it('2段構成（モック09準拠）: 上段に種別・行き先・運用番号、下段に列車番号・矢印・所属会社・編成番号を表示する', () => {
        fixture.componentRef.setInput(
            'card',
            card({
                operationNumber: '54',
                formationNumber: '10708',
                formationAgencyName: '相模鉄道',
            }),
        );
        fixture.detectChanges();

        const rows: HTMLElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('a > span'),
        );
        expect(rows.length).toBe(2);

        const [top, bottom] = rows;
        expect(top.textContent).toContain('各停');
        expect(top.textContent).toContain('横浜 行');
        expect(top.textContent).toContain('運用54');
        expect(top.textContent).not.toContain('1234');

        expect(bottom.textContent).toContain('1234');
        expect(bottom.textContent).toContain('▲');
        expect(bottom.textContent).toContain('相模鉄道');
        expect(bottom.textContent).toContain('10708');
    });

    it('formationAgencyName が無ければ会社名なしで編成番号のみ表示する', () => {
        fixture.componentRef.setInput(
            'card',
            card({ formationNumber: '9999', formationAgencyName: undefined }),
        );
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('9999');
        expect(fixture.nativeElement.textContent).not.toContain('相模鉄道');
    });

    it('status="between" かつ direction="inbound" のとき ▲ を表示する', () => {
        fixture.componentRef.setInput('card', card({ direction: 'inbound' }));
        fixture.componentRef.setInput('status', 'between');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('▲');
    });

    it('status="between" かつ direction="outbound" のとき ▼ を表示する', () => {
        fixture.componentRef.setInput('card', card({ direction: 'outbound' }));
        fixture.componentRef.setInput('status', 'between');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('▼');
    });

    it('formationNumber が無ければ充当編成表示欄を出さない', () => {
        fixture.componentRef.setInput('card', card({ formationNumber: undefined }));
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('span.tw-truncate.tw-font-bold.tw-text-grey-900'),
        ).toBeNull();
    });

    it('formationNumber があれば無加工の値をそのまま表示する', () => {
        fixture.componentRef.setInput('card', card({ formationNumber: '9999' }));
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('9999');
        expect(
            fixture.nativeElement.querySelector('span.tw-truncate.tw-font-bold.tw-text-grey-900'),
        ).not.toBeNull();
    });
});
