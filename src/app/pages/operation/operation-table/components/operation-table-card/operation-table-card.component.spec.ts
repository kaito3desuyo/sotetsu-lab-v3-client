import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import {
    edgePath,
    OperationTableCardComponent,
    TripRow,
} from './operation-table-card.component';

describe('OperationTableCardComponent', () => {
    let component: OperationTableCardComponent;
    let fixture: ComponentFixture<OperationTableCardComponent>;

    const stations = [
        { stationId: 'st-1', stationName: '海老名' },
        { stationId: 'st-2', stationName: '横浜' },
    ] as StationDetailsDto[];

    const tripClasses = [
        {
            tripClassId: 'tc-1',
            tripClassName: '快速',
            tripClassColor: '#1e88e5',
        },
        {
            tripClassId: 'tc-2',
            tripClassName: '回送',
            tripClassColor: '#9e9e9e',
        },
    ] as TripClassDetailsDto[];

    const operationTrip = {
        operation: { operationId: 'op-1', operationNumber: '11' },
        trips: [
            {
                tripOperationListId: 'tol-1',
                startTime: { stationId: 'st-1', departureTime: '05:15:00' },
                endTime: { stationId: 'st-2', arrivalTime: '05:52:00' },
                trip: {
                    tripId: 'trip-1',
                    tripNumber: '2002',
                    tripClassId: 'tc-1',
                    tripDirection: 0,
                    tripBlockId: 'block-1',
                    depotIn: false,
                    depotOut: false,
                },
            },
            {
                tripOperationListId: 'tol-2',
                startTime: { stationId: 'st-2', departureTime: '22:09:00' },
                endTime: { stationId: 'st-1', arrivalTime: '22:13:00' },
                trip: {
                    tripId: 'trip-2',
                    tripNumber: '9394',
                    tripClassId: 'tc-2',
                    tripDirection: 1,
                    tripBlockId: 'block-2',
                    depotIn: true,
                    depotOut: false,
                },
            },
        ],
    } as unknown as OperationTripsDto;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableCardComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationTableCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('operationTrip', operationTrip);
        fixture.componentRef.setInput('stations', stations);
        fixture.componentRef.setInput('tripClasses', tripClasses);
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('本数サマリは trips.length と一致する', () => {
        expect(component.tripCount()).toBe(2);
    });

    const tripRows = () =>
        component.rows().filter((row): row is TripRow => row.kind === 'trip');

    it('上りは左に始点・右に終点、下りは左に終点・右に始点を置く（本番の折返し表）', () => {
        const [inbound, outbound] = tripRows();

        expect(inbound).toMatchObject({
            left: { stationName: '海老名', time: '05:15:00' },
            right: { stationName: '横浜', time: '05:52:00' },
            tripClassName: '快速',
            tripNumber: '2002',
            isDeadhead: false,
        });
        expect(outbound).toMatchObject({
            left: { stationName: '海老名', time: '22:13:00' },
            right: { stationName: '横浜', time: '22:09:00' },
        });
    });

    it('折り返しは同じ側の端の線でつなぎ、入庫は線の代わりに △ の印を置く', () => {
        const [inbound, outbound] = tripRows();

        // 上りは横浜（右）で終わり、下りが横浜（右）から出る
        expect(inbound.rightEdge).toMatchObject({
            up: false,
            down: true,
            depot: null,
        });
        expect(outbound.rightEdge).toMatchObject({
            up: true,
            down: false,
            depot: null,
        });
        // 入庫した後には続かない
        expect(outbound.leftEdge).toEqual({
            up: false,
            down: false,
            depot: 'in',
            path: '',
        });
        expect(
            fixture.nativeElement.querySelector('svg[aria-label="入庫"]'),
        ).toBeTruthy();
    });

    it('端の線は列の中央の縦線と、駅名の側へ出る横線の path にする', () => {
        expect(edgePath({ up: true, down: false, depot: null }, 'left')).toBe(
            'M8 0 V8 M8 8 H16',
        );
        expect(edgePath({ up: false, down: true, depot: null }, 'right')).toBe(
            'M8 8 V16 M8 8 H0',
        );
        expect(edgePath({ up: false, down: false, depot: 'out' }, 'left')).toBe(
            '',
        );
    });

    it('同じ向きへ続けて走るときは、終点側から始点側へ渡すつなぎの行を挟む', () => {
        const [first] = operationTrip.trips;
        fixture.componentRef.setInput('operationTrip', {
            ...operationTrip,
            trips: [
                first,
                {
                    ...first,
                    tripOperationListId: 'tol-3',
                    startTime: { stationId: 'st-1', departureTime: '06:00:00' },
                    endTime: { stationId: 'st-2', arrivalTime: '06:30:00' },
                    trip: { ...first.trip, tripNumber: '2004' },
                },
            ],
        });
        fixture.detectChanges();

        const rows = component.rows();
        expect(rows.map((row) => row.kind)).toEqual(['trip', 'link', 'trip']);
        expect(rows[1].rightEdge).toMatchObject({ up: true, down: false });
        expect(rows[1].leftEdge).toMatchObject({ up: false, down: true });
        expect(fixture.nativeElement.querySelectorAll('.op-row').length).toBe(
            3,
        );
    });

    it('回送は isDeadhead=true として判定される', () => {
        expect(tripRows()[1].isDeadhead).toBe(true);
    });

    it('4 文字以上の駅名は 3 文字幅に横を詰める', () => {
        fixture.componentRef.setInput('stations', [
            { stationId: 'st-1', stationName: 'かしわ台' },
            { stationId: 'st-2', stationName: '横浜' },
        ]);
        fixture.detectChanges();

        expect(tripRows()[0].left.stationScale).toBeCloseTo(0.75);
        expect(tripRows()[0].right.stationScale).toBe(1);
    });

    it('groupName 未指定時はヘッダに群バッジを表示しない（モック03）', () => {
        const badge = fixture.nativeElement.querySelector(
            'header .tw-bg-black\\/10',
        );
        expect(badge).toBeNull();
    });

    it('groupName 指定時はヘッダに実データの群名バッジを表示する（モック03）', () => {
        fixture.componentRef.setInput('groupName', 'G群（東横線）');
        fixture.detectChanges();

        const badge = fixture.nativeElement.querySelector(
            'header .tw-bg-black\\/10',
        );
        expect(badge?.textContent.trim()).toBe('G群（東横線）');
    });

    describe('乗り移りは入出庫の値に頼らず、つながりで見分ける', () => {
        const link = (
            tripOperationListId: string,
            tripId: string,
            p: object,
        ) => ({
            tripOperationListId,
            tripId,
            operationId: 'op-1',
            previous: null,
            next: null,
            ...p,
        });
        const to = (rule: number) => ({
            tripOperationListId: 'x',
            tripId: 'x',
            operationId: 'op-2',
            operationNumber: '15K',
            stationId: 'st-2',
            rule,
        });

        // 入出庫の値がどちらも false の 16K 型（9385 が別の運用へ移り、3824 で戻る）
        const setTransfer = () => {
            const base = operationTrip.trips;
            fixture.componentRef.setInput('operationTrip', {
                ...operationTrip,
                trips: base.map((t) => ({
                    ...t,
                    trip: { ...t.trip, depotIn: false, depotOut: false },
                })),
            });
            fixture.componentRef.setInput('links', [
                link('tol-1', 'trip-1', { next: to(2) }),
                link('tol-2', 'trip-2', { previous: to(2) }),
            ]);
            fixture.detectChanges();
        };

        it('depot が false でも、乗り移りの端で線を切る', () => {
            setTransfer();
            const [first, second] = tripRows();
            // 上りの終点（右）と下りの始点（右）は同じ駅だが、折り返しの線を引かない
            expect(first.rightEdge).toMatchObject({ up: false, down: false });
            expect(second.rightEdge).toMatchObject({ up: false, down: false });
        });

        it('depot が false でも、乗り移りの端に □ だけを出す', () => {
            setTransfer();
            const el: HTMLElement = fixture.nativeElement;
            expect(
                el.querySelector('svg[aria-label="別の運用へ"]'),
            ).toBeTruthy();
            expect(
                el.querySelector('svg[aria-label="別の運用から"]'),
            ).toBeTruthy();
            expect(el.querySelector('svg[aria-label="入庫"]')).toBeNull();
            expect(el.querySelector('svg[aria-label="出庫"]')).toBeNull();
        });

        it('depot も立つ乗り移りの端は △○ だけで □ は出さず、線は切る', () => {
            const base = operationTrip.trips;
            fixture.componentRef.setInput('operationTrip', {
                ...operationTrip,
                trips: base.map((t) => ({
                    ...t,
                    trip: { ...t.trip, depotIn: true, depotOut: true },
                })),
            });
            fixture.componentRef.setInput('links', [
                link('tol-1', 'trip-1', { next: to(2) }),
                link('tol-2', 'trip-2', { previous: to(2) }),
            ]);
            fixture.detectChanges();
            const el: HTMLElement = fixture.nativeElement;
            expect(el.querySelector('svg[aria-label="入庫"]')).toBeTruthy();
            expect(el.querySelector('svg[aria-label="出庫"]')).toBeTruthy();
            expect(el.querySelector('svg[aria-label="別の運用へ"]')).toBeNull();
            expect(
                el.querySelector('svg[aria-label="別の運用から"]'),
            ).toBeNull();
            const [first] = tripRows();
            expect(first.rightEdge).toMatchObject({ up: false, down: false });
        });

        it('決まり 2 でなければ線はつながったまま', () => {
            setTransfer();
            fixture.componentRef.setInput('links', [
                link('tol-1', 'trip-1', { next: to(1) }),
                link('tol-2', 'trip-2', { previous: to(3) }),
            ]);
            fixture.detectChanges();
            const [first] = tripRows();
            expect(first.rightEdge).toMatchObject({ down: true });
        });
    });

    describe('前後の運用', () => {
        const end = (p: object) =>
            ({
                tripOperationListId: 'x',
                tripId: 'x',
                operationId: 'x',
                operationNumber: '',
                stationId: 'st-1',
                rule: 2,
                ...p,
            }) as never;

        const setLinks = (links: object[]) => {
            fixture.componentRef.setInput('links', links);
            fixture.detectChanges();
        };

        it('運用の頭に「↓ 11K から」を出す', () => {
            setLinks([
                {
                    tripOperationListId: 'tol-1',
                    tripId: 'trip-1',
                    operationId: 'op-1',
                    previous: end({ operationNumber: '11K' }),
                    next: null,
                },
            ]);
            const el: HTMLElement = fixture.nativeElement;
            expect(el.querySelector('.link-from')?.textContent.trim()).toBe(
                '↓ 11K から',
            );
        });

        it('運用の末尾に「↓ 12K へ」を出す', () => {
            setLinks([
                {
                    tripOperationListId: 'tol-2',
                    tripId: 'trip-2',
                    operationId: 'op-1',
                    previous: null,
                    next: end({ operationNumber: '12K' }),
                },
            ]);
            const el: HTMLElement = fixture.nativeElement;
            expect(el.querySelector('.link-to')?.textContent.trim()).toBe(
                '↓ 12K へ',
            );
        });

        it('途中の「から」はその列車の行の上、「へ」は下に出す', () => {
            setLinks([
                {
                    tripOperationListId: 'tol-1',
                    tripId: 'trip-1',
                    operationId: 'op-1',
                    previous: null,
                    next: end({ operationNumber: '17K' }),
                },
                {
                    tripOperationListId: 'tol-2',
                    tripId: 'trip-2',
                    operationId: 'op-1',
                    previous: end({ operationNumber: '17K' }),
                    next: null,
                },
            ]);
            const el: HTMLElement = fixture.nativeElement;
            const rows = el.querySelectorAll('.op-row');
            const from = el.querySelector('.link-mid-trip-from') as Node;
            const to = el.querySelector('.link-mid-trip-to') as Node;
            expect(from.textContent.trim()).toBe('↓ 17K から');
            expect(to.textContent.trim()).toBe('↓ 17K へ');
            // へ は 1 本目の下、から は 2 本目の上
            expect(
                rows[0].compareDocumentPosition(to) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
            expect(
                from.compareDocumentPosition(rows[rows.length - 1]) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        });

        it('列車の途中の切り替えをその列車の下に出す', () => {
            setLinks([
                {
                    tripOperationListId: 'tol-1',
                    tripId: 'trip-1',
                    operationId: 'op-1',
                    previous: null,
                    next: end({ operationNumber: '18K', rule: 1 }),
                },
            ]);
            const el: HTMLElement = fixture.nativeElement;
            expect(
                el.querySelector('.link-mid-trip-to')?.textContent.trim(),
            ).toBe('海老名から 18K へ');
        });
    });
});
