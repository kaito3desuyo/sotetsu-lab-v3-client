import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import io from 'socket.io-client';
import { Socket } from 'ngx-socket-io';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    // private readonly url = environment.socketUrl;
    // private socket: SocketIOClient.Socket;

    constructor(private socket: Socket) {
        console.log(socket);
    }

    emit(emitName: string, data?: any): void {
        this.socket.emit(emitName, data);
    }

    on(onName: string): Observable<unknown> {
        return this.socket.fromEvent(onName);
    }
    /*
    connect(namespace: string = ''): void {
        this.socket = io(this.url + namespace, {
            transports: ['websocket']
        });
    }

    emit(emitName: string, data?: any): void {
        this.socket.emit(emitName, data);
    }

    on(onName: string): Observable<any> {
        const observable = new Observable(observer => {
            this.socket.on(onName, (data: any) => {
                observer.next(data);
            });

            return () => {
                this.socket.disconnect();
            };
        });
        return observable;
    }
    */
}
