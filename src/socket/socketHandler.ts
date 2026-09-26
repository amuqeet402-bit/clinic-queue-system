import { Server, Socket } from 'socket.io';
import { queueService } from '../db/queueService';
import { CallAlertPayload } from '../types/queue';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Send current state immediately upon connection
    socket.emit('queue:state', queueService.getState());

    // Allow client to explicitly request latest state
    socket.on('queue:get_state', (callback) => {
      const state = queueService.getState();
      socket.emit('queue:state', state);
      if (callback) callback(state);
    });
    socket.on('queue:state', (callback) => {
      const state = queueService.getState();
      socket.emit('queue:state', state);
      if (callback) callback(state);
    });

    // Patient requests new token
    socket.on('patient:generate_token', (data: { patientName?: string; priority?: number }, callback) => {
      try {
        const state = queueService.getState();
        if (state.config.isPaused) {
          if (callback) callback({ success: false, error: 'Queue intake is currently paused by clinic staff.' });
          return;
        }

        const result = queueService.generateToken(data?.patientName, data?.priority || 0);
        
        // Broadcast new queue state to all screens
        io.emit('queue:state', queueService.getState());

        if (callback) {
          callback({
            success: true,
            token: result.token,
            queuePosition: result.queuePosition,
            estimatedWaitMinutes: result.estimatedWaitMinutes,
          });
        }
      } catch (err) {
        console.error('Error generating token:', err);
        if (callback) callback({ success: false, error: 'Internal server error' });
      }
    });

    // Doctor calls next token
    socket.on('doctor:call_next', (data: { roomNumber?: string }, callback) => {
      try {
        const calledToken = queueService.callNext(data?.roomNumber);
        const newState = queueService.getState();

        // Broadcast updated state to all clients
        io.emit('queue:state', newState);

        if (calledToken) {
          const payload: CallAlertPayload = {
            token: calledToken,
            room: calledToken.doctorRoom || newState.config.roomNumber,
            doctor: newState.config.doctorName,
            timestamp: Date.now(),
          };
          // Broadcast alert to trigger TV chime and speech
          io.emit('token:called', payload);
        }

        if (callback) {
          callback({ success: true, token: calledToken });
        }
      } catch (err) {
        console.error('Error calling next token:', err);
        if (callback) callback({ success: false, error: 'Failed to call next token' });
      }
    });

    // Doctor recalls current token (re-announces)
    socket.on('doctor:recall', (_data, callback) => {
      try {
        const recalled = queueService.recallCurrent();
        const newState = queueService.getState();

        io.emit('queue:state', newState);

        if (recalled) {
          const payload: CallAlertPayload = {
            token: recalled,
            room: recalled.doctorRoom || newState.config.roomNumber,
            doctor: newState.config.doctorName,
            timestamp: Date.now(),
          };
          io.emit('token:called', payload);
        }

        if (callback) callback({ success: true, token: recalled });
      } catch (err) {
        console.error('Error recalling token:', err);
        if (callback) callback({ success: false, error: 'Failed to recall' });
      }
    });

    // Doctor skips current token or marks as no-show
    socket.on('doctor:skip', (data: { reason?: 'skipped' | 'no_show' }, callback) => {
      try {
        const skipped = queueService.skipCurrent(data?.reason || 'no_show');
        io.emit('queue:state', queueService.getState());
        if (callback) callback({ success: true, token: skipped });
      } catch (err) {
        console.error('Error skipping token:', err);
        if (callback) callback({ success: false, error: 'Failed to skip' });
      }
    });

    // Doctor toggles queue pause
    socket.on('doctor:toggle_pause', (_data, callback) => {
      try {
        const isPaused = queueService.togglePause();
        io.emit('queue:state', queueService.getState());
        if (callback) callback({ success: true, isPaused });
      } catch (err) {
        console.error('Error pausing queue:', err);
        if (callback) callback({ success: false, error: 'Failed to toggle pause' });
      }
    });

    // Doctor updates configuration (average wait time, room, etc.)
    socket.on('doctor:update_config', (updates, callback) => {
      try {
        const updatedConfig = queueService.updateConfig(updates);
        io.emit('queue:state', queueService.getState());
        if (callback) callback({ success: true, config: updatedConfig });
      } catch (err) {
        console.error('Error updating config:', err);
        if (callback) callback({ success: false, error: 'Failed to update config' });
      }
    });

    // Reset queue for testing or end-of-day
    socket.on('doctor:reset_queue', (_data, callback) => {
      try {
        queueService.resetQueue();
        io.emit('queue:state', queueService.getState());
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error resetting queue:', err);
        if (callback) callback({ success: false, error: 'Failed to reset queue' });
      }
    });

    // Demo/Stress Simulation: batch generates demo patients for high volume testing (e.g. 100+ daily patients)
    socket.on('admin:simulate_patients', (data: { count?: number }, callback) => {
      try {
        const count = Math.min(data?.count || 10, 50);
        const demoNames = ['James Wilson', 'Emma Watson', 'Liam Johnson', 'Olivia Davis', 'Noah Brown', 'Sophia Miller', 'Lucas Garcia', 'Ava Martinez', 'Ethan Robinson', 'Mia Clark'];
        for (let i = 0; i < count; i++) {
          const randomName = demoNames[i % demoNames.length] + ' ' + (Math.floor(Math.random() * 90) + 10);
          const priority = (i === 3 || i === 7) ? 1 : 0;
          queueService.generateToken(randomName, priority);
        }
        io.emit('queue:state', queueService.getState());
        if (callback) callback({ success: true, added: count });
      } catch (err) {
        console.error('Error simulating patients:', err);
        if (callback) callback({ success: false, error: 'Simulation failed' });
      }
    });
  });
}
