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
    socket.on('patient:generate_token', (data: { 
      patientName: string; 
      phoneNumber: string; 
      department?: string; 
      priority?: number 
    }, callback) => {
      try {
        const state = queueService.getState();
        if (state.config.isPaused) {
          if (callback) callback({ success: false, error: 'Queue intake is currently paused by clinic staff.' });
          return;
        }

        // Validate name
        const cleanName = (data?.patientName || '').trim();
        if (!cleanName || cleanName.length < 2) {
          if (callback) callback({ success: false, error: 'Please enter a valid patient name (minimum 2 characters).' });
          return;
        }

        // Validate 11-digit phone number
        const cleanPhone = (data?.phoneNumber || '').replace(/\D/g, '');
        if (cleanPhone.length !== 11) {
          if (callback) callback({ 
            success: false, 
            error: 'Phone number must be exactly 11 digits (e.g., 03001234567).' 
          });
          return;
        }

        const dept = data?.department?.trim() || 'General Consultation';
        const result = queueService.generateToken(cleanName, cleanPhone, dept, data?.priority || 0);
        
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
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Internal server error';
        console.error('Error generating token:', errMsg);
        if (callback) callback({ success: false, error: errMsg });
      }
    });

    // Patient cancels their active token
    socket.on('patient:cancel_token', (data: { tokenId: string }, callback) => {
      try {
        if (!data?.tokenId) {
          if (callback) callback({ success: false, error: 'Token ID is required.' });
          return;
        }

        const cancelled = queueService.cancelToken(data.tokenId);
        if (!cancelled) {
          if (callback) callback({ success: false, error: 'Token not found or already completed.' });
          return;
        }

        // Broadcast updated state
        io.emit('queue:state', queueService.getState());

        if (callback) {
          callback({ success: true, token: cancelled });
        }
      } catch (err) {
        console.error('Error cancelling token:', err);
        if (callback) callback({ success: false, error: 'Failed to cancel token' });
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
        const demoNames = [
          'James Wilson', 'Emma Watson', 'Liam Johnson', 'Olivia Davis', 
          'Noah Brown', 'Sophia Miller', 'Lucas Garcia', 'Ava Martinez', 
          'Ethan Robinson', 'Mia Clark'
        ];
        const depts = ['General Consultation', 'General Physician', 'Routine Checkup', 'Pediatric Care'];
        for (let i = 0; i < count; i++) {
          const randomName = demoNames[i % demoNames.length] + ' ' + (Math.floor(Math.random() * 90) + 10);
          const randomPhone = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
          const priority = (i === 3 || i === 7) ? 1 : 0;
          const dept = depts[i % depts.length];
          queueService.generateToken(randomName, randomPhone, dept, priority);
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
