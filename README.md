# 🏥 Digital Clinic Token and Queue Management System

A real-time, zero-latency queue and token management application for modern clinics, built with **Next.js 14**, **Socket.IO**, **Tailwind CSS**, and zero-dependency synthetic **Web Audio & Speech announcements**.

Designed to seamlessly handle 100+ daily patients across three synchronized interfaces.

---

## 🚀 Live Access URLs

When the server is running on `http://localhost:3000`:

| Interface | URL | Target Audience / Device | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Central Hub** | [`http://localhost:3000/`](http://localhost:3000/) | Navigation & Live Overview | Live queue metrics, quick switcher to all three views |
| **Patient View** | [`http://localhost:3000/patient`](http://localhost:3000/patient) | Patient Smartphone / Mobile Web | 1-Tap sequential token intake (1, 2, 3...), live "Now Serving", position in line, estimated wait time, vibration & turn alert |
| **Doctor Console** | [`http://localhost:3000/doctor`](http://localhost:3000/doctor) | Doctor Desktop / Tablet | Distinct "Call Next Token", "Recall", "Mark No-Show/Skip", "Pause Queue", consultation stopwatch, queue list, batch simulation |
| **Waiting Room TV** | [`http://localhost:3000/tv`](http://localhost:3000/tv) | Waiting Hall TV / Large Monitor | High-contrast 10-foot UI, giant "Now Serving" token number, last 4 called tokens, live digital clock, two-tone hospital chime, and voice announcements |

---

## ⚡ How to Run the Live Preview

### 1. Start the Server
In PowerShell or Terminal from the project root directory:
```bash
npm run dev
```
*(The server is currently running live in the background on port `3000`)*.

### 2. Recommended Multi-Screen Interactive Test
1. **Window A (Waiting Room TV)**: Open `http://localhost:3000/tv`. Click anywhere on the screen once to prime audio for the chimes.
2. **Window B (Patient)**: Open `http://localhost:3000/patient`. Click **Generate Token** to claim Token #1.
3. **Window C (Doctor)**: Open `http://localhost:3000/doctor`. Click the large green **CALL NEXT TOKEN** button.
4. **Watch the Magic**:
   - The TV display instantly flashes, chimes with a pleasant two-tone signal, and announces: *"Token number 1, please proceed to Room 101."*
   - The Patient screen instantly turns green with *"It's Your Turn! Please proceed to Room 101."*
   - The Doctor dashboard begins counting the active consultation timer.

---

## 🛠️ Architecture & Features

- **Sequential Integer Tokens**: Clean, intuitive numbering (`1`, `2`, `3`...).
- **Sub-10ms WebSocket Broadcasts**: Built using Socket.IO attached directly to the Next.js HTTP server.
- **Audio Chime & Speech Synthesis**: Uses the browser-native **Web Audio API** (no external `.mp3` files needed) and **Web Speech API** for natural voice announcements.
- **Priority Intake**: Flag urgent, elderly, or pediatric cases to automatically jump ahead in the queue.
- **Local Persistence & Audit Trail**: All queue state and events are safely stored in `data/clinic_state.json` and `data/audit_log.json`, surviving restarts.
- **100+ Patient Stress Testing**: Includes a **+ Add 10 Demo Patients** button on the Doctor dashboard for instant high-volume testing.
