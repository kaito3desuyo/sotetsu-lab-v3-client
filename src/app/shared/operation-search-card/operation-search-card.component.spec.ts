import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationSearchCardComponent } from './operation-search-card.component';

const operation = (operationId: string, operationNumber: string) =>
    ({ operationId, operationNumber }) as OperationDetailsDto;

describe('OperationSearchCardComponent', () => {
    let component: OperationSearchCardComponent;
    let fixture: ComponentFixture<OperationSearchCardComponent>;
    let findManyByCalendarId: jest.Mock;

    beforeEach(async () => {
        findManyByCalendarId = jest.fn(({ calendarId }) =>
            of(
                calendarId === 'today'
                    ? [
                          operation('op-12', '12'),
                          operation('op-100', '100'),
                          operation('op-01', '01'),
                      ]
                    : [operation(`${calendarId}-op`, '21')],
            ),
        );

        await TestBed.configureTestingModule({
            imports: [OperationSearchCardComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
                {
                    provide: CalendarListStateQuery,
                    useValue: { calendars$: of([]) },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: { todaysCalendarId$: of('today') },
                },
                {
                    provide: OperationService,
                    useValue: { findManyByCalendarId },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationSearchCardComponent);
        component = fixture.componentInstance;
    });

    it('ダイヤを渡さなければ今日のダイヤで、運用は 100 を除いて番号順に並べる', () => {
        fixture.detectChanges();

        expect(component.selectedCalendarId()).toBe('today');
        expect(component.selectedOperationId()).toBeNull();
        expect(component.operations().map((o) => o.operationNumber)).toEqual([
            '01',
            '12',
        ]);
    });

    it('ページから渡したダイヤと運用を選んだ状態で始める', () => {
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.componentRef.setInput('operationId', 'cal-1-op');
        fixture.detectChanges();

        expect(component.selectedCalendarId()).toBe('cal-1');
        expect(component.selectedOperationId()).toBe('cal-1-op');
        expect(findManyByCalendarId).toHaveBeenLastCalledWith({
            calendarId: 'cal-1',
        });
    });

    it('ダイヤを選び直すと運用番号を外し、そのダイヤの運用を取り直す', () => {
        fixture.componentRef.setInput('operationId', 'op-12');
        fixture.detectChanges();

        component.selectCalendar('cal-2');
        fixture.detectChanges();

        expect(component.selectedOperationId()).toBeNull();
        expect(component.operations().map((o) => o.operationId)).toEqual([
            'cal-2-op',
        ]);
    });

    it('運用番号まで選んでいれば運用行路図へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        fixture.detectChanges();

        component.selectOperation('op-12');
        component.submit();

        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'op-12' },
        ]);
    });

    it('ダイヤだけなら運用表へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        fixture.detectChanges();

        component.submit();

        expect(navigate).toHaveBeenCalledWith([
            '/operation/table',
            { calendar_id: 'today' },
        ]);
    });
});
