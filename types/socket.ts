import type { NextApiResponse } from 'next';
import type { Server as NetServer, Socket } from 'net';
import type { Server as SocketIOServer } from 'socket.io';

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
} 