import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

import { TimetableAllLineTableComponent } from './timetable-all-line-table.component';

describe('TimetableAllLineTableComponent', () => {
    let component: TimetableAllLineTableComponent;
    let fixture: ComponentFixture<TimetableAllLineTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineTableComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TimetableAllLineTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineTableComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('tripDirection', 1);
        fixture.componentRef.setInput('stations', []);
        fixture.componentRef.setInput('trips', []);
        fixture.componentRef.setInput('pageSettings', {
            pageIndex: 0,
            pageSize: 10,
            length: 0,
        });
        fixture.componentRef.setInput('viewModes', new Map());
        fixture.componentRef.setInput('bordersAfter', new Map());
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('TimetableAllLineTableComponent の編集操作', () => {
    let fixture: ComponentFixture<TimetableAllLineTableComponent>;

    const trip = {
        tripId: 't1',
        tripNumber: '101',
        tripBlockId: 'b1',
        calendarId: 'c1',
        tripOperationLists: [],
        tripClass: {
            tripClassId: 'k1',
            tripClassName: '各停',
            tripClassColor: '#000000',
        },
        times: [],
    } as unknown as TripDetailsDto;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineTableComponent],
            providers: [provideRouter([]), provideNoopAnimations()],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineTableComponent);
        fixture.componentRef.setInput('calendar', {
            calendarId: 'c1',
            startDate: '2026-03-14',
        });
        fixture.componentRef.setInput('tripDirection', 1);
        fixture.componentRef.setInput('stations', []);
        fixture.componentRef.setInput('trips', [trip]);
        fixture.componentRef.setInput('pageSettings', {
            pageIndex: 0,
            pageSize: 10,
            length: 1,
        });
        fixture.componentRef.setInput('viewModes', new Map());
        fixture.componentRef.setInput('bordersAfter', new Map());
    });

    const labels = (): string[] =>
        Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll(
                'button[aria-label]',
            ),
        ).map((b) => b.getAttribute('aria-label') ?? '');

    it('編集できない人には、編集・コピー・削除・グループの操作を出さない', () => {
        fixture.componentRef.setInput('canEdit', false);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('tfoot')).toBeNull();
        expect(labels().filter((l) => l.startsWith('列車 '))).toEqual([]);
    });

    it('編集できる人には、編集・コピー・削除・グループの操作を出す', () => {
        fixture.componentRef.setInput('canEdit', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('tfoot')).not.toBeNull();
        expect(labels()).toEqual(
            expect.arrayContaining([
                '列車 101 を編集する',
                '列車 101 をコピーして新規作成',
                '列車 101 を削除する',
                '列車 101 を基準にグルーピングする',
            ]),
        );
    });

    it('既定では編集操作を出さない', () => {
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('tfoot')).toBeNull();
    });
    // 見出しの段は 24px ちょうど（下の罫線 1px を含む）で sticky の位置を決めている。
    // 14px の字のチップは 24px あり段を押し広げるので、ここだけ字を 13px にする（docs/design.md）
    it('見出しの運用番号のチップは字を 13px にして段に収める', () => {
        fixture.componentRef.setInput('trips', [
            {
                ...trip,
                tripOperationLists: [
                    {
                        operationId: 'op-1',
                        operation: { operationNumber: '54' },
                    },
                ],
            },
        ]);
        fixture.detectChanges();

        const tag = (fixture.nativeElement as HTMLElement).querySelector(
            'thead app-operation-number-tag',
        );
        expect(tag).toHaveClass('!tw-text-[13px]');
    });
});

describe('TimetableAllLineTableComponent の isFeatureDate', () => {
    let fixture: ComponentFixture<TimetableAllLineTableComponent>;

    beforeEach(async () => {
        jest.useFakeTimers();
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineTableComponent],
            providers: [provideRouter([]), provideNoopAnimations()],
        })
            .overrideComponent(TimetableAllLineTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineTableComponent);
        fixture.componentRef.setInput('calendar', {
            calendarId: 'c1',
            startDate: '2026-11-14',
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('改正日の日本時間 0 時より前は false', () => {
        jest.setSystemTime(new Date('2026-11-13T14:59:00Z'));
        expect(fixture.componentInstance.isFeatureDate()).toBe(false);
    });

    it('改正日の日本時間 0 時を過ぎたら true', () => {
        jest.setSystemTime(new Date('2026-11-13T15:01:00Z'));
        expect(fixture.componentInstance.isFeatureDate()).toBe(true);
    });
});
