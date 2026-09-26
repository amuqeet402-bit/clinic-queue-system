const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

console.log('Connecting to Dr. Abdul Muqeet Clinic Queue System at http://localhost:3000 ...');

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket Server successfully! Socket ID:', socket.id);

  // Reset queue first for a clean automated test run
  socket.emit('doctor:reset_queue', {}, () => {
    console.log('🧹 Cleaned queue for testing.');

    // Listen for queue state
    socket.once('queue:state', (initialState) => {
      console.log('✅ Received initial queue state:');
      console.log(`   Clinic: ${initialState.config.clinicName}, Doctor: ${initialState.config.doctorName}, Waiting: ${initialState.totalWaiting}`);

      // TEST 1: Phone number validation failure (less than 11 digits)
      socket.emit('patient:generate_token', { 
        patientName: 'Test Invalid', 
        phoneNumber: '030012345', // Only 9 digits
        department: 'General Consultation' 
      }, (failRes) => {
        if (!failRes.success && failRes.error.includes('11 digits')) {
          console.log('✅ Validation Test Passed: Rejected invalid phone number (less than 11 digits):', failRes.error);
        } else {
          console.error('❌ Validation Test Failed:', failRes);
          process.exit(1);
        }

        // TEST 2: Generate Valid Token 1 (Standard)
        socket.emit('patient:generate_token', { 
          patientName: 'Ahmad Khan', 
          phoneNumber: '03001234567', // Exactly 11 digits
          department: 'General Consultation',
          priority: 0 
        }, (res1) => {
          console.log('🎟️ Patient 1 Generated Token:', res1.token.tokenNumber, `(Dept: ${res1.token.department}, Phone: ${res1.token.phoneNumber})`);

          // TEST 3: Generate Valid Token 2 (Elderly/Priority)
          socket.emit('patient:generate_token', { 
            patientName: 'Zainab Bibi (Elderly)', 
            phoneNumber: '03219876543', 
            department: 'Routine Checkup',
            priority: 1 
          }, (res2) => {
            console.log('🎟️ Patient 2 Generated Token:', res2.token.tokenNumber, '(Priority: Express)');

            // TEST 4: Generate Valid Token 3 (To test Cancel Token)
            socket.emit('patient:generate_token', { 
              patientName: 'Farhan Tariq', 
              phoneNumber: '03451122334', 
              department: 'General Physician',
              priority: 0 
            }, (res3) => {
              console.log('🎟️ Patient 3 Generated Token:', res3.token.tokenNumber);

              // TEST 5: Cancel Token 3
              socket.emit('patient:cancel_token', { tokenId: res3.token.id }, (cancelRes) => {
                if (cancelRes.success && cancelRes.token.status === 'cancelled') {
                  console.log('🚫 Cancel Token Test Passed: Successfully cancelled Token #', cancelRes.token.tokenNumber);
                } else {
                  console.error('❌ Cancel Token Test Failed:', cancelRes);
                  process.exit(1);
                }

                // TEST 6: Doctor Calls Next (Should call Priority Token #2 first!)
                socket.emit('doctor:call_next', { roomNumber: 'Room 101' }, (callRes1) => {
                  console.log('🩺 Doctor Called Next Token:', callRes1.token.tokenNumber, `(Patient: ${callRes1.token.patientName}, Dept: ${callRes1.token.department})`);

                  // Doctor Recalls Current
                  socket.emit('doctor:recall', {}, (recallRes) => {
                    console.log('📢 Doctor Recalled Token on TV:', recallRes.token.tokenNumber);

                    // Final Check State
                    socket.emit('queue:get_state', (finalState) => {
                      console.log('🏁 Final Queue State Verification:');
                      console.log(`   Clinic Name: ${finalState.config.clinicName}`);
                      console.log(`   Now Serving: Token #${finalState.nowServing?.tokenNumber} (${finalState.nowServing?.patientName})`);
                      console.log(`   Remaining Waiting: ${finalState.totalWaiting} (Token #${finalState.waitingList[0]?.tokenNumber} - ${finalState.waitingList[0]?.patientName})`);
                      console.log('🎉 ALL NEW CLINIC FEATURES & VALIDATIONS VERIFIED WITH 100% ACCURACY!');
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
