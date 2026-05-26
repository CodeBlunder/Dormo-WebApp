# DORMO 
Dormo is a simple web app that helps hostel students see washing machine availability in real time, avoid unnecessary waiting, and use shared machines more efficiently.


## Features

- Live **machine status board** (Free / Running / Finished)  
- Real-time updates across all devices  
- Start / end cycle controls for each machine  
- Automatic cycle time estimation (e.g., 45–50 mins)   
- Simple, hostel-friendly UI that works on phones



## Problem It Solves

In my hostel, students do not know:
- Which machines are free  
- How long current washes will take  
- Whether it is worth walking to the laundry room present in the basement

This app provides a shared, live view so everyone can plan their laundry without crowding or guesswork.


## Tech Stack

- Frontend: (e.g.) React / Next.js or Flutter / React Native  
- Backend: Firebase (Auth + Firestore/Realtime Database)  
- Auth: Lightweight login (name/room or anonymous + profile)  
- Hosting: Any static hosting / app store depending on platform (Netlify)

You can adapt these choices depending on your preferences.

***

## Core Concepts

- **Machines**  
  - Each machine has an ID, status, current user, start time, and expected end time.
- **Sessions**  
  - A session represents one wash cycle started by a user on a machine.
- **Real-time sync**  
  - When any user updates a machine status, all other users see it instantly.

***

## Getting Started (High-Level)

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd dormo
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure backend**

   - Create a Firebase project.  
   - Enable Auth and Firestore / Realtime Database.  
   - Add your config keys to an `.env` or config file in the project.

4. **Run the app**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open the app in your browser or emulator and try:
   - Mark a machine as running on one device.  
   - Watch it update instantly on another device.



Deployed using Netlify
https://golden-mandazi-4dbb9e.netlify.app/
