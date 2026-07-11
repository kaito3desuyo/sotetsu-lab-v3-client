import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainDiagramInfoPanelComponent } from './train-diagram-info-panel.component';

describe('TrainDiagramInfoPanelComponent', () => {
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
        fixture.componentRef.setInput('info', {
            tripId: 't1',
            tripNumber: '5001',
            tripClassName: '各停',
            tripClassColor: '#8a8a8a',
            destinationName: '海老名',
            detailLink: ['/timetable', 'all-line', {}],
        });
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
