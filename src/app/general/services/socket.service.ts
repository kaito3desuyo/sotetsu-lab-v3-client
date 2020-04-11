import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    private readonly url = environment.socketUrl;
    private conn: WebSocket;

    connect(): void {
        console.log('connected to socket server');
        const conn = new WebSocket(this.url);
        this.conn = conn;
    }

    disconnect(): void {
        console.log('disconnected to socket server');
        this.conn.close();
    }

    emit(action: string, data: any): void {
        this.conn.send(
            JSON.stringify({
                action,
                data: JSON.stringify(data),
            })
        );
    }

    on(): Observable<any> {
        const observable = new Observable((observer) => {
            this.conn.onmessage = (e) => {
                observer.next(e);
            };
        });
        return observable;
    }
}
