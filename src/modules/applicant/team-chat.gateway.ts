import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TeamChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinTeamRoom')
  handleJoinRoom(
    @MessageBody() data: { teamId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`team_${data.teamId}`);
    client.emit('joinedRoom', { message: `Successfully joined team room: team_${data.teamId}` });
  }

  @SubscribeMessage('sendTeamMessage')
  handleMessage(
    @MessageBody() data: { teamId: string; senderName: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const chatPayload = {
      senderName: data.senderName,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    // Broadcast message to all members in the specific team room
    this.server.to(`team_${data.teamId}`).emit('receiveTeamMessage', chatPayload);
  }
}