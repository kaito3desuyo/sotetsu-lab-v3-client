import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainDiagramInfoPanelComponent } from './train-diagram-info-panel.component';

describe('TrainDiagramInfoPanelComponent', () => {
    const baseInfo = {
        tripId: 't1',
        tripNumber: '1234',
        tripClassName: '快速',
        tripClassColor: '#3f51b5',
        destinationName: '海老名',
        detailLink: ['/timetable', 'all-line', {}],
    };

    let component: TrainDiagramInfoPanelComponent;
    let fixture: ComponentFixture<TrainDiagramInfoPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramInfoPanelComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TrainDiagramInfoPanelComponent, {
                set: { schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainDiagramInfoPanelComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('info', baseInfo);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('運用番号は運用群の色で「運用」の字を付けず、行路図へのリンクにする', () => {
        fixture.componentRef.setInput('info', {
            ...baseInfo,
            operationNumber: '71',
            operationId: 'op-71',
        });
        fixture.detectChanges();
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
            'a[data-operation-number]',
        );
        expect(link.textContent?.trim()).toBe('71');
        expect(link.getAttribute('href')).toContain(
            '/operation/route-diagram;operation_id=op-71',
        );
        expect(link.style.backgroundColor).not.toBe('');
        expect(fixture.nativeElement.textContent).not.toContain('運用');
    });

    it('全線時刻表へのリンクの字は「全線時刻表で見る ›」', () => {
        fixture.componentRef.setInput('info', baseInfo);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain(
            '全線時刻表で見る ›',
        );
    });

    it('host は PC で右下に浮かぶカード、枠は tw-border-solid', () => {
        const host: HTMLElement = fixture.nativeElement;
        expect(host.className).toContain('lg:tw-w-[22rem]');
        expect(host.className).toContain('tw-border-solid');
    });

    it('Task 13: 自身の高さの変化を ResizeObserver 経由で heightChange に出す', async () => {
        let observerCallback:
            | ((entries: { contentRect: { height: number } }[]) => void)
            | undefined;
        const disconnect = jest.fn();
        const originalResizeObserver = (window as any).ResizeObserver;
        (window as any).ResizeObserver = jest
            .fn()
            .mockImplementation((callback) => {
                observerCallback = callback;
                return { observe: jest.fn(), disconnect };
            });

        const freshFixture = TestBed.createComponent(
            TrainDiagramInfoPanelComponent,
        );
        freshFixture.componentRef.setInput('info', baseInfo);
        freshFixture.detectChanges();
        await freshFixture.whenStable();

        const spy = jest.spyOn(
            freshFixture.componentInstance.heightChange,
            'emit',
        );
        observerCallback?.([{ contentRect: { height: 120 } }]);
        expect(spy).toHaveBeenCalledWith(120);

        freshFixture.destroy();
        expect(disconnect).toHaveBeenCalled();

        (window as any).ResizeObserver = originalResizeObserver;
    });
});
