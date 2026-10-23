# TradeFox — Paper Trading Platform

A clean, modern, Groww-inspired authentication interface and full-featured paper trading terminal built for **TradeFox** with strict PostgreSQL database persistence and Spring Boot backend integration.

---

## 🌟 Key Features

### 1. Authentication (`index.html`)
- **Strict Backend API Integration**:
  - Connects to Spring Boot backend: `POST /api/auth/login` and `POST /api/auth/signup`.
  - Saves real server JWT tokens (`tradefox_token`) and user profiles (`tradefox_user`).
  - Automatically redirects to the terminal dashboard on login or registration.
- **Groww-Inspired Design**: Clean typography, emerald green (`#00D09C`), and Light/Dark mode.

---

### 2. Paper Trading Dashboard (`dashboard.html`)
- **Layer 1: Top Navigation Bar**:
  - **Top Left**: Logo + `Welcome to TradeFox, $name` (dynamically loaded from PostgreSQL `users` table via `GET /api/users/{userId}`).
  - **Middle**: Stock search bar with autocomplete dropdown (`Ctrl + K` shortcut) querying equities.
  - **Top Right**: Light/Dark theme toggle + Profile avatar with **Wallet Balance Popup Modal**:
    - Real-time PostgreSQL wallet balance (`wallet_balance`).
    - Invested margin, Total account value, and Server Sync.
    - Logout button.
- **Layer 2: Major Indices Strip**:
  - Live scores for **NIFTY 50**, **SENSEX**, **BANK NIFTY**, **NIFTY IT**, and **INDIA VIX** via `GET /api/market/quotes`.
- **Layer 3: Main Navigation Strip**:
  - **Explore**: Live benchmarks (`RELIANCE`, `TCS`, `HDFCBANK`, `INFY`, etc.) with sector, LTP, and day change.
  - **Holdings**: Direct from PostgreSQL `holdings` table via `GET /api/holdings?userId={userId}` with live returns calculations.
  - **Orders**: Direct from PostgreSQL `orders` table via `GET /api/orders?userId={userId}`.
  - **Watchlist**: Direct from PostgreSQL `watchlist` table via `GET /api/watchlist?userId={userId}`.

---

### 3. Stock Terminal Window & Technicals
- Clicking on **any stock** in Explore, Holdings, Orders, Watchlist, or Search opens the **Stock Terminal Window**:
  - **Live Canvas Chart**: Interactive price graph with timeframes (`1D`, `1W`, `1M`, `1Y`, `ALL`), gradient fill, and hover crosshair tooltip showing exact timestamp and price.
  - **Performance Range Sliders**:
    - Today's Low vs Today's High marker slider.
    - 52-Week Low vs 52-Week High marker slider.
  - **Key Technicals & Fundamentals**: Open, Prev Close, Volume, Upper Circuit (+20%), Lower Circuit (-20%), Market Cap, P/E Ratio, and Beta.
  - **Watchlist Toggle**: 1-click star button that adds or removes the stock in PostgreSQL `watchlist` table (`POST /api/watchlist` and `DELETE /api/watchlist`).
  - **Paper Trading Panel**:
    - BUY (Emerald) / SELL (Coral Red) segmented toggle.
    - Delivery (CNC) / Intraday (MIS) selector.
    - Quantity input with `-` / `+` steppers and quick lot chips (`+10`, `+25`, `+50`, `+100`).
    - Dynamic required margin and available balance validation.
    - For SELL orders, checks available holding shares from PostgreSQL.
    - Atomic database order execution via `POST /api/orders` (synchronizing `users`, `orders`, `holdings`, and `transactions` tables).

---

## 🚀 How to Run

1. **Frontend**:
   👉 **[http://localhost:5500](http://localhost:5500)** (Login page)  
   👉 **[http://localhost:5500/dashboard.html](http://localhost:5500/dashboard.html)** (Terminal Dashboard)

2. **Backend**:
   - Spring Boot running at `http://localhost:8080`.
   - PostgreSQL connected to database `fox`.
