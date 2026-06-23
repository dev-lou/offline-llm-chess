<div align="center">
  <h1 align="center">✦ CHESS CHRONICLES ✦</h1>
  <p align="center">
    <strong>A Next-Generation RPG Chess Engine built with React, Vite, and Local LLMs</strong>
  </p>
</div>

<br />

## 🌌 Overview

**Chess Chronicles** (formerly Pixel Chess Quest) reimagines the classic game of chess by injecting intense, tactical RPG mechanics into every move. Standard chess rules apply, but every piece is now a champion equipped with **HP**, **MP**, **Passive Abilities**, and devastating **Active Spells**. 

Play against a fully autonomous local AI that evaluates the board state, manages spell cooldowns, and executes calculated attacks powered by **LM Studio** and state-of-the-art Local LLMs like *Phi-4-mini-instruct*.

---

## ⚡ Key Features

- **RPG Mechanics Engine**: Every piece has a unique class (e.g., War Chief, Archmage, Arcane Rider) with Health Points (HP) and Mana Points (MP).
- **Dynamic Spellcasting**: Cast incredible spells like *Meteor*, *Earthquake*, and *Blink Strike*. Spells feature stunning CSS animations, precise impact timing, and synthesized sound effects.
- **Wounded System**: When a piece drops to 0 HP from a spell, it becomes **Wounded**, unable to move or cast until healed by a friendly spell. Standard chess captures still instantly slay pieces regardless of HP.
- **Local LLM AI Opponent**: Connect the game directly to your local AI engine (e.g., LM Studio). The AI parses the FEN, evaluates HP/MP limits, and responds in real-time with precise UCI moves and calculated spellcasts.
- **Dynamic AI Difficulty**:
  - **EASY**: The AI plays forgivingly, allowing you to test out spell combos.
  - **MEDIUM**: Solid calculation with occasional tactical misses.
  - **HARD**: Absolute Grandmaster. The AI optimizes spell targeting and executes relentless attacks.
- **2026 Premium UI/UX**: Built with modern Glassmorphism, dynamic gradients, an interactive tabbed Codex, and immersive soundscapes.

---

## 🎲 The Codex: Classes & Spells

| Piece | Class | Passive Ability | Active Spell | Effect |
| :--- | :--- | :--- | :--- | :--- |
| **Pawn** | Squire | +1 ATK when adjacent to ally | **Shield Bash** | Stun an adjacent enemy for 1 turn (20 MP) |
| **Knight** | Arcane Rider | Ignores terrain effects | **Blink Strike** | Teleport to any square within 3 tiles (40 MP) |
| **Bishop** | Mage | +1 spell range | **Holy Beam** | Deal 25 damage to any piece on its diagonal (30 MP) |
| **Rook** | Fortress Knight | Blocks spells through its file | **Earthquake** | All pieces on the same rank lose 10 HP (35 MP) |
| **Queen** | Archmage | Regenerates 5 MP/turn | **Meteor** | Deal 40 damage in a 3x3 area (60 MP) |
| **King** | War Chief | Immune to stun | **Rally Cry** | Restore 20 HP to all adjacent allies (50 MP) |

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (v18+ recommended)
2. **LM Studio** (or an equivalent local AI API server). 
   - *Recommended Model:* `phi-4-mini-instruct`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dev-lou/offline-llm-chess.git
   cd offline-llm-chess
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

4. **Connect the Local AI**
   - Open LM Studio and start the Local Server.
   - Open the game in your browser.
   - Click on **⚙️ AI Settings** on the landing page.
   - Enter your local endpoint (e.g., `http://192.168.1.118:1234/v1/chat/completions`) and the exact model name.
   - Select your difficulty and click **ENTER ARENA**!

---

## 🛠️ Tech Stack

- **Framework**: React 18 & Vite
- **Styling**: Tailwind CSS & Vanilla CSS (Keyframe Animations)
- **State Management**: React Hooks (`useAI`, `useSpells`, `useChessGame`)
- **Chess Logic**: `chess.js`
- **AI Integration**: Standard OpenAI-compatible `/v1/chat/completions` API via Fetch API

---

<div align="center">
  <i>May your spells hit true and your King stand strong.</i>
</div>
