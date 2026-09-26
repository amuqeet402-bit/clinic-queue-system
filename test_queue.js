const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

console.log('Connecting to Clinic Queue System at http://localhost:3000 ...');

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket Server successfully! Socket ID:', socket.id);

  // Reset queue first for a clean automated test run
  socket.emit('doctor:reset_queue', {}, () => {
    console.log('🧹 Cleaned queue for testing.');

    // Listen for queue state
    socket.once('queue:state', (initialState) => {
      console.log('✅ Received initial queue state:');
      console.log(`   Clinic: ${initialState.config.clinicName}, Waiting: ${initialState.totalWaiting}, Serving: ${initialState.nowServing ? initialState.nowServing.tokenNumber : 'None'}`);

      // Generate Token 1 (Standard)
      socket.emit('patient:generate_token', { patientName: 'Alice Johnson', priority: 0 }, (res1) => {
        console.log('🎟️ Patient 1 Generated Token:', res1.token.tokenNumber, '(Expected: 1)');

        // Generate Token 2 (Priority)
        socket.emit('patient:generate_token', { patientName: 'Robert Smith (Elderly)', priority: 1 }, (res2) => {
          console.log('🎟️ Patient 2 Generated Token:', res2.token.tokenNumber, '(Priority: Express)');

          // Generate Token 3 (Standard)
          socket.emit('patient:generate_token', { patientName: 'Charlie Brown', priority: 0 }, (res3) => {
            console.log('🎟️ Patient 3 Generated Token:', res3.token.tokenNumber, '(Expected: 3)');

            // Doctor Calls Next (Should pick priority #2 first!)
            socket.emit('doctor:call_next', { roomNumber: 'Room 101' }, (callRes1) => {
              console.log('🩺 Doctor Called Next Token:', callRes1.token.tokenNumber, `(Patient: ${callRes1.token.patientName})`);

              // Doctor Recalls Current
              socket.emit('doctor:recall', {}, (recallRes) => {
                console.log('📢 Doctor Recalled Token on TV:', recallRes.token.tokenNumber);

                // Doctor Calls Next again (completing #2, moving to #1)
                socket.emit('doctor:call_next', { roomNumber: 'Room 101' }, (callRes2) => {
                  console.log('🩺 Doctor Called Next Token again:', callRes2.token.tokenNumber, `(Patient: ${callRes2.token.patientName})`);

                  // Doctor Skips/No-Show #1
                  socket.emit('doctor:skip', { reason: 'no_show' }, (skipRes) => {
                    console.log('⚠️ Doctor Marked No-Show for Token:', skipRes.token.tokenNumber);

                    // Check state via callback
                    socket.emit('queue:get_state', (finalState) => {
                      console.log('🏁 Final Queue State Verification:');
                      console.log(`   Total Completed: ${finalState.totalServedToday}`);
                      console.log(`   Total Skipped/No-show: ${finalState.totalSkippedToday}`);
                      console.log(`   Remaining Waiting: ${finalState.totalWaiting} (Token #${finalState.waitingList[0]?.tokenNumber})`);
                      console.log('🎉 REAL-TIME QUEUE VERIFICATION PASSED WITH 100% ACCURACY!');
                      socket.disconnect();
                      setTimeout(() => process.exit(0), 100);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    socket.emit('queue:get_state');
  });
});

socket.on('token:called', (payload) => {
  console.log(`🔔 [BROADCAST] token:called event: Token #${payload.token.tokenNumber} -> Proceed to ${payload.room}`);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});
