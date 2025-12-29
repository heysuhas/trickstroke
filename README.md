# TrickStroke

**TrickStroke** is a real-time multiplayer social deduction word game where creativity meets deception.

## 🎮 How to Play

1.  **Join a Lobby**: Up to 8 players can join. One player is the Host.
2.  **Roles**:
    *   **Artists**: Receive a **Secret Word**.
    *   **Trickster**: Does NOT see the word. Their goal is to blend in.
3.  **The Game**:
    *   Players take turns submitting **one word** related to the Secret Word.
    *   **Trickster Twist**: If the Trickster goes first, they get a list of options to help them bluff.
    *   **No Repeats**: You cannot use the Secret Word or any word already submitted.
4.  **Discussion & Voting**:
    *   After everyone submits, discuss and vote on who you think the Trickster is.
5.  **Winning**:
    *   **Artists Win**: If they vote out the Trickster.
    *   **Trickster Wins**: If they survive the vote (or if the vote is a tie after Max Rounds).

## 🛠 Tech Stack

*   **Frontend**: React (Vite)
*   **Backend**: Node.js (Express)
*   **Real-time**: Socket.IO
*   **Styling**: Custom CSS (Outfit font, Neon/Pop aesthetic)

## 🚀 Setup & Run

### Prerequisites
*   Node.js installed.

### 1. Start the Server
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:3000`.

### 2. Start the Client
```bash
cd client
npm install
npm run dev
```
Client runs on `http://localhost:5173`.

## 🎨 Features
*   **Dynamic UI**: Glassmorphism and Neon accents.
*   **Host Config**: Customize rounds and timer settings.
*   **Responsive**: Works on desktop and mobile.
*   **Smart Logic**: Prevents duplicate usernames and ensures unique secret words per session.

---
*Created for the TrickStroke Game Development Project.*
