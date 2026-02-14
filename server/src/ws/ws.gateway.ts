import { type OnGatewayConnection, type OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import type { ChannelId, UserId, WsEvents } from '../../../libs/api/entities';
import { ENV } from '../env';

const JWTPayloadSchema = z.object({
  userId: z.string(),
});

@WebSocketGateway({ cors: true })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly userSockets = new Map<UserId, Socket>();
  private userDisconnectCallback?: (userId: UserId) => void;

  onUserDisconnect(cb: (userId: UserId) => void) {
    this.userDisconnectCallback = cb;
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string | undefined;
      if (!token) {
        client.disconnect();

        return;
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      const payload = JWTPayloadSchema.parse(decoded);
      const userId = payload.userId as UserId;

      client.data.userId = userId;
      this.userSockets.set(userId, client);

      console.log(`WS connected: ${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as UserId | undefined;
    if (userId) {
      this.userSockets.delete(userId);
      this.userDisconnectCallback?.(userId);
      console.log(`WS disconnected: ${userId}`);
    }
  }

  emitToChannel<E extends keyof WsEvents>(channelId: ChannelId, event: E, data: WsEvents[E]) {
    this.server.to(channelId).emit(event, data);
  }

  emitToAll<E extends keyof WsEvents>(event: E, data: WsEvents[E]) {
    this.server.emit(event, data);
  }

  async joinRoom(userId: UserId, channelId: ChannelId) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      await socket.join(channelId);
    }
  }

  async leaveRoom(userId: UserId) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          await socket.leave(room);
        }
      }
    }
  }
}
