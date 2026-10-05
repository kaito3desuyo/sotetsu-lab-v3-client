import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ITimetableEditFormTrip } from '../../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../../special/enums/timetable-edit-form.enum';
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';
import { TimetableEditFormGridComponent } from './timetable-edit-form-grid.component';

const S = ETimetableEditFormStopType;
type Row = [ETimetableEditFormStopType, string | null, string | null];

const stations = ['海老名', 'かしわ台', '大和', '二俣川'].map(
    (stationName, i) => ({ stationId: `s${i}`, stationName }),
) as StationDetailsDto[];

const NORMAL: Row[] = [
    [S.STOP, null, '11:54'],
    [S.PASS, null, null],
    [S.STOP, '12:01', '12:02'],
    [S.STOP, '12:10', null],
];

function makeTrip(tripNumber: string, rows: Row[]): ITimetableEditFormTrip {
    const fb = new FormBuilder();
    return fb.group({
        tripNumber: [tripNumber],
        tripDirection: [0],
        tripClassId: [''],
        operationId: [''],
        depotIn: [false],
        depotOut: [false],
        times: fb.array(
            rows.map(([stopType, arrivalTime, departureTime], i) =>
                fb.group({
                    stationId: [`s${i}`],
                    stopType: [stopType],
                    arrivalTime: [arrivalTime],
                    departureTime: [departureTime],
                }),
            ),
            [
                TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
            ],
        ),
    }) as unknown as ITimetableEditFormTrip;
}

describe('TimetableEditFormGridComponent', () => {
    let fixture: ComponentFixture<TimetableEditFormGridComponent>;
    let component: TimetableEditFormGridComponent;
    let tripsForm: FormArray<ITimetableEditFormTrip>;

    function setup(
        trips: ITimetableEditFormTrip[],
        compact = false,
        rows: StationDetailsDto[] = stations,
    ): void {
        tripsForm = new FormArray(trips);
        fixture = TestBed.createComponent(TimetableEditFormGridComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('tripsForm', tripsForm);
        fixture.componentRef.setInput('stations', rows);
        fixture.componentRef.setInput('visibleStations', rows);
        fixture.componentRef.setInput(
            'tripIndexes',
            trips.map((_, i) => i),
        );
        fixture.componentRef.setInput('compact', compact);
        fixture.detectChanges();
    }

    const input = (label: string): HTMLInputElement =>
        fixture.nativeElement.querySelector(`input[aria-label="${label}"]`);
    const times = (tripIndex = 0) =>
        tripsForm.at(tripIndex).get('times') as FormArray;
    const keydown = (el: HTMLElement, key: string) =>
        el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableEditFormGridComponent],
        }).compileComponents();
    });

    it('始発の着・終着の発は無効で空表示、途中は打てる', () => {
        setup([makeTrip('3030', NORMAL)]);
        const [first, , middle, last] = component.columns()[0].cells;

        expect(first.arrivalTime).toEqual(
            expect.objectContaining({ disabled: true, value: null }),
        );
        expect(first.departureTime).toEqual(
            expect.objectContaining({ disabled: false, value: '11:54' }),
        );
        expect(middle.arrivalTime.disabled).toBe(false);
        expect(middle.departureTime.disabled).toBe(false);
        expect(last.departureTime.disabled).toBe(true);
        expect(input('3030 海老名 着').disabled).toBe(true);
    });

    it('‖ の駅の着・発は灰色の空表示だが打てる（紙からの入力で停を押す手間を省く）', () => {
        setup([
            makeTrip('3030', [
                [S.NOT_GOING_THROUGH, null, '11:50'],
                [S.STOP, null, '12:00'],
                [S.STOP, '12:05', '12:06'],
                [S.STOP, '12:10', null],
            ]),
        ]);
        const [notGoing, first] = component.columns()[0].cells;

        expect(notGoing.mark).toBe('‖');
        expect(notGoing.arrivalTime).toEqual(
            expect.objectContaining({
                muted: true,
                disabled: false,
                value: null,
            }),
        );
        expect(notGoing.departureTime).toEqual(
            expect.objectContaining({
                muted: true,
                disabled: false,
                value: null,
            }),
        );
        expect(first.arrivalTime).toEqual(
            expect.objectContaining({ muted: true, disabled: true }),
        );
        expect(first.departureTime.muted).toBe(false);
        expect(input('3030 海老名 着').disabled).toBe(false);
    });

    it('‖ の駅に時刻を打つと停にする（control に同じ値が残っていても）', () => {
        setup([
            makeTrip('3030', [
                [S.NOT_GOING_THROUGH, null, '11:50'],
                [S.STOP, null, '12:00'],
                [S.STOP, '12:05', '12:06'],
                [S.STOP, '12:10', null],
            ]),
        ]);
        const el = input('3030 海老名 発');

        el.focus();
        el.value = '1150';
        el.dispatchEvent(new Event('blur'));

        expect(times().at(0).get('stopType').value).toBe(S.STOP);
        expect(times().at(0).get('stopType').dirty).toBe(true);
        expect(times().at(0).get('departureTime').value).toBe('11:50');
    });

    it('終着の発はその駅の行にフォーカスがある間だけ打てる（上から順に打つと最後の駅が毎回終着になるため）', () => {
        setup([makeTrip('3030', NORMAL)]);
        const arrival = input('3030 二俣川 着');

        arrival.focus();
        fixture.detectChanges();
        expect(input('3030 二俣川 発').disabled).toBe(false);

        keydown(arrival, 'ArrowRight');
        fixture.detectChanges();
        expect(input('3030 二俣川 発')).toHaveFocus();
        expect(input('3030 二俣川 発').disabled).toBe(false);

        input('3030 二俣川 発').value = '1212';
        input('3030 二俣川 発').blur();
        fixture.detectChanges();
        expect(input('3030 二俣川 発').disabled).toBe(true);
        // 値はフォームに残し（次の駅を打てば出てくる）、灰色のセルは空に見せる
        expect(times().at(3).get('departureTime').value).toBe('12:12');
        expect(input('3030 二俣川 発').value).toBe('');
    });

    it('‖ の駅の着を打って → で発へ移ると、停になって終着になっても発にフォーカスが残る', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, '11:54'],
                [S.PASS, null, null],
                [S.STOP, '12:01', '12:02'],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
        ]);
        const arrival = input('3030 二俣川 着');

        arrival.focus();
        arrival.value = '1210';
        keydown(arrival, 'ArrowRight');
        fixture.detectChanges();

        expect(times().at(3).get('stopType').value).toBe(S.STOP);
        expect(input('3030 二俣川 発')).toHaveFocus();
        expect(input('3030 二俣川 発').disabled).toBe(false);
    });

    it('停車駅が 1 つだけなら始発の着・終着の発を無効にしない', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
        ]);
        const [only] = component.columns()[0].cells;

        expect(only.arrivalTime.disabled).toBe(false);
        expect(only.departureTime.disabled).toBe(false);
    });

    it('前の駅より早い時刻を赤くし、誤りの一言を出す', () => {
        setup([
            makeTrip('3040', [
                [S.STOP, null, '12:15'],
                [S.PASS, null, null],
                [S.STOP, '12:10', '12:11'],
                [S.STOP, '12:20', null],
            ]),
        ]);

        expect(component.columns()[0].cells[2].arrivalTime.error).toBe(true);
        expect(component.messages()).toEqual([
            '3040: 大和の着（12:10）が海老名（12:15）より早い',
        ]);
        expect(input('3040 大和 着').parentElement).toHaveClass('tw-bg-red-50');
        expect(tripsForm.invalid).toBe(true);
    });

    it('停車駅が 2 つ未満の一言は、触ってから出す', () => {
        setup([
            makeTrip('3030', [
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
        ]);
        expect(component.messages()).toEqual([]);

        const button: HTMLButtonElement = fixture.nativeElement.querySelector(
            'button[aria-label="3030 海老名 停車種別 ‖"]',
        );
        button.click();
        fixture.detectChanges();

        expect(times().at(0).get('stopType').value).toBe(S.STOP);
        expect(component.messages()).toEqual(['3030: 停車駅が 2 つ以上必要']);
    });

    it('停車種別のボタンは 停 → レ → ‖ → 停 と進め、dirty にする', () => {
        setup([makeTrip('3030', NORMAL)]);
        const control = times().at(2).get('stopType');
        const click = () => {
            fixture.nativeElement
                .querySelector(`button[aria-label^="3030 大和 停車種別"]`)
                .click();
            fixture.detectChanges();
        };

        click();
        expect(control.value).toBe(S.PASS);
        expect(control.dirty).toBe(true);
        click();
        expect(control.value).toBe(S.NOT_GOING_THROUGH);
        click();
        expect(control.value).toBe(S.STOP);
    });

    it('フォーカスで数字 4 桁、外れると HH:mm にして control へ入れる', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 大和 発');

        el.focus();
        expect(el.value).toBe('1202');

        el.value = '1203';
        el.dispatchEvent(new Event('blur'));

        expect(times().at(2).get('departureTime').value).toBe('12:03');
        expect(times().at(2).get('departureTime').dirty).toBe(true);
        expect(el.value).toBe('12:03');
    });

    it('3 桁は先頭に 0 を足す', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 海老名 発');

        el.focus();
        el.value = '958';
        el.dispatchEvent(new Event('blur'));

        expect(times().at(0).get('departureTime').value).toBe('09:58');
    });

    it('読めない入力は元に戻し、空は時刻を消す', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 海老名 発');

        el.focus();
        el.value = '99';
        el.dispatchEvent(new Event('blur'));
        expect(el.value).toBe('11:54');
        expect(times().at(0).get('departureTime').value).toBe('11:54');

        el.focus();
        el.value = '';
        el.dispatchEvent(new Event('blur'));
        expect(times().at(0).get('departureTime').value).toBeNull();
    });

    it('打鍵は数字 4 桁までに絞る', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 大和 着');

        el.focus();
        el.value = '12:345';
        el.dispatchEvent(new Event('input'));

        expect(el.value).toBe('1234');
    });

    it('Enter で下の駅へ。‖ の欄は飛ばさない', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, '11:54'],
                [S.NOT_GOING_THROUGH, null, null],
                [S.STOP, '12:01', '12:02'],
                [S.STOP, '12:10', null],
            ]),
        ]);
        const from = input('3030 海老名 発');

        from.focus();
        keydown(from, 'Enter');

        expect(input('3030 かしわ台 発')).toHaveFocus();
    });

    it('→ で隣の欄へ、無効な欄は飛ばす（停レ‖ → 着は無効 → 発）', () => {
        setup([makeTrip('3030', NORMAL)]);
        const mark: HTMLButtonElement = fixture.nativeElement.querySelector(
            'button[aria-label^="3030 海老名 停車種別"]',
        );

        mark.focus();
        keydown(mark, 'ArrowRight');

        expect(input('3030 海老名 発')).toHaveFocus();
    });

    it('行先は最後の停車駅、種別は tripClassId から引く', () => {
        setup([makeTrip('3030', NORMAL)]);
        fixture.componentRef.setInput('tripClasses', [
            {
                tripClassId: 'tc-1',
                tripClassName: '特急（SO）',
                tripClassColor: '#e60012',
            },
        ]);
        tripsForm.at(0).get('tripClassId').setValue('tc-1');
        fixture.detectChanges();

        expect(component.columns()[0].destination).toBe('二俣川');
        expect(component.columns()[0].tripClass?.tripClassName).toBe(
            '特急（SO）',
        );
    });

    it('スマホでは行先の段を出し、PC では出さない', () => {
        setup([makeTrip('3030', NORMAL)], true);
        expect(fixture.nativeElement).toHaveTextContent(/行先/);

        fixture.componentRef.setInput('compact', false);
        fixture.detectChanges();
        expect(fixture.nativeElement).not.toHaveTextContent(/行先/);
    });

    it('tripIndexes の列車だけを描き、一言は全列車ぶん出す', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, '12:15'],
                [S.STOP, '12:10', null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
            makeTrip('3040', NORMAL),
        ]);
        fixture.componentRef.setInput('tripIndexes', [1]);
        fixture.detectChanges();

        expect(component.columns().map((c) => c.tripNumber)).toEqual(['3040']);
        expect(component.messages()).toEqual([
            '3030: かしわ台の着（12:10）が海老名（12:15）より早い',
        ]);
    });

    it('− は removeTrip に列車の位置を、＋ は addTrip を出す', () => {
        setup([makeTrip('3030', NORMAL), makeTrip('3040', NORMAL)]);
        const removed = jest.fn();
        const added = jest.fn();
        component.removeTrip.subscribe(removed);
        component.addTrip.subscribe(added);

        fixture.nativeElement
            .querySelector('button[aria-label="3040を削除する"]')
            .click();
        fixture.nativeElement
            .querySelector(
                'button[aria-label="列車を追加する"]:not([disabled])',
            )
            .click();

        expect(removed).toHaveBeenCalledWith(1);
        expect(added).toHaveBeenCalled();
    });
    it('分岐をまたぐ駅の組は停車種別を赤くして注意を出す。保存は止めない', () => {
        // 上りの並び。本線 大和1 かしわ台2 海老名3、厚木線 かしわ台1 厚木2
        const routed = (
            [
                ['厚木', [['atsugi', 2]]],
                ['海老名', [['main', 3]]],
                [
                    'かしわ台',
                    [
                        ['main', 2],
                        ['atsugi', 1],
                    ],
                ],
                ['大和', [['main', 1]]],
            ] as [string, [string, number][]][]
        ).map(([stationName, lists], i) => ({
            stationId: `s${i}`,
            stationName,
            routeStationLists: lists.map(([routeId, stationSequence]) => ({
                routeStationListId: `${routeId}${i}`,
                routeId,
                stationSequence,
            })),
        })) as StationDetailsDto[];
        setup(
            [
                makeTrip('1234', [
                    [S.STOP, null, '11:50'],
                    [S.STOP, '11:54', '11:55'],
                    [S.PASS, null, null],
                    [S.STOP, '12:10', null],
                ]),
            ],
            false,
            routed,
        );

        const cell = component.tripViews()[0].cells;
        expect(cell.map((c) => c.routeError)).toEqual([
            true,
            true,
            false,
            false,
        ]);
        expect(component.messages()).toContain(
            '1234: 厚木から海老名へは上りで行けない（分岐をまたいでいる）',
        );
        expect(
            fixture.nativeElement.querySelector(
                'button[aria-label="1234 厚木 停車種別 停"]',
            ),
        ).toHaveClass('tw-text-red-800');
        expect(times().valid).toBe(true);
    });
});
