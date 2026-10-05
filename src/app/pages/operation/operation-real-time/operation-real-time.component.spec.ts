import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { NewOperationPostCardService } from 'src/app/shared/new-operation-post-card/new-operation-post-card.service';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeComponent } from './operation-real-time.component';

describe('OperationRealTimeComponent', () => {
    let component: OperationRealTimeComponent;
    let fixture: ComponentFixture<OperationRealTimeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideHttpClient(),
                provideRouter([]),
                OperationRealTimeService,
                {
                    provide: SocketService,
                    useValue: { on: () => EMPTY },
                },
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
                {
                    provide: NewOperationPostCardService,
                    useValue: { submitEvent$: EMPTY },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
