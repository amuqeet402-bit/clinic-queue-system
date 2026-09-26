# 🏥 Dr. Abdul Muqeet Clinic - Real-Time Token & Queue Management System

A production-grade, zero-latency queue and token management application built with **Next.js 14**, **Socket.IO**, **Tailwind CSS**, and zero-dependency synthetic **Web Audio & Speech announcements**.

Designed for high-throughput clinic operations handling 100+ daily patients across three synchronized real-time interfaces.

---

## 🚀 Live Access URLs

When the server is running on `http://localhost:3000`:

| Interface | URL | Target Audience / Device | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Central Hub** | [`http://localhost:3000/`](http://localhost:3000/) | Navigation & System Overview | Live queue metrics, quick switcher to all three views |
| **Patient View** | [`http://localhost:3000/patient`](http://localhost:3000/patient) | Patient Smartphone / Web | Patient registration (Name, 11-digit Phone, Department selection), 1-token-per-device restriction, live queue position, estimated wait time, turn alert, and **Cancel Token** button |
| **Doctor Dashboard** | [`http://localhost:3000/doctor`](http://localhost:3000/doctor) | Doctor Desktop / Tablet | Distinct "Call Next Token", "Recall on TV", "Mark No-Show/Skip", "Pause Queue", consultation duration timer, patient department & contact info, and 1-click batch simulator |
| **Waiting Room TV** | [`http://localhost:3000/tv`](http://localhost:3000/tv) | Waiting Hall TV / Monitor | High-contrast 10-foot UI, **prominent live date & clock**, giant "Now Serving" token number & patient department, last 4 called tokens, two-tone clinic chime, and voice announcements |

---

## ✨ Features & Enhancements

1. **Branding**:
   - Official branding configured across all screens for **Dr. Abdul Muqeet Clinic** (Consultant: Dr. Abdul Muqeet).
2. **Patient Registration & Phone Validation**:
   - Required Patient Full Name.
   - Required mobile number strictly validated for **exactly 11 digits** (e.g. `03001234567`) on both frontend and backend.
   - Department / Specialty selection:
     - `General Consultation` (Default)
     - `General Physician`
     - `Routine Checkup`
     - `Pediatric Care`
     - `Emergency / Urgent`
3. **Device Restriction (One Token Per Device)**:
   - Front-end and local state locking ensures a single device/browser cannot generate multiple simultaneous queue numbers.
   - While a token is active (`waiting` or `serving`), the patient pass is locked on screen. Once consultation is completed or cancelled, registration unlocks.
4. **Cancel Token**:
   - Patients can voluntarily cancel their active token if they need to leave, instantly freeing up the queue for others.
5. **Waiting Room TV Display**:
   - Prominent, high-contrast **Live Date & Standard Time** panel with day of the week, full date, and real-time seconds.
   - Web Audio API two-tone hospital chime + Web Speech voice announcement on each patient call.

---

## ⚡ How to Run the Live Preview

### 1. Start the Server
```bash
npm run dev
```

### 2. Multi-Screen Real-Time Test
1. **Window A (Waiting Room TV)**: Open `http://localhost:3000/tv`. Click anywhere once to enable audio.
2. **Window B (Patient)**: Open `http://localhost:3000/patient`. Enter name, 11-digit phone number, select department, and click **Generate Token**.
3. **Window C (Doctor Console)**: Open `http://localhost:3000/doctor`. Click the green **CALL NEXT TOKEN** button.
4. **Observation**:
   - The TV display instantly chimes, flashes, and speaks: *"Token number 1, please proceed to Room 101."*
   - The Patient screen turns green with a live alert: *"It's Your Turn! Please proceed to Room 101."*
