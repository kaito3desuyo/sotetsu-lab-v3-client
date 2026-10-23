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
});
