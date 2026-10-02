# 🎰 Project 2: Real-Time Decentralized Prediction Market & Oracle Hub (Student Assignment)

Welcome to your practical Ethers.js assignment! In this project, you will build a full-stack Web3 Prediction Market dApp where users can connect their Web3 wallet, place bets on binary YES/NO prediction outcomes, and claim proportional pool payouts when markets are resolved by an Oracle.

---

## ⚡ Live Deployed Sepolia Testnet Contracts (No Deployment Needed!)

To make starting easy for you, the smart contracts have **already been deployed and verified on Sepolia Testnet**! You do **NOT** need to deploy any smart contracts yourself to complete this assignment.

| Contract Name | Network | Deployed Contract Address | Verified Source Code Link |
| :--- | :--- | :--- | :--- |
| **PredictionMarketOracleHub** | Sepolia | `0x2b76e3270698c75c2f1bc46C6190Fb5565ED278b` | [View Verified Contract Code on Etherscan](https://sepolia.etherscan.io/address/0x2b76e3270698c75c2f1bc46C6190Fb5565ED278b#code) |

> ℹ️ **Note**: This address is already pre-configured in `frontend/src/contracts/predictionConfig.ts`. All you need to do is get some free Sepolia testnet ETH and start building your Web3 React hooks!

---

## 🎯 Learning Objectives

By completing this project, you will demonstrate mastery of:
1. **Wallet Connection & EIP-1193 / EIP-6963**: Provider setup (`BrowserProvider`), chain validation, and address management in React.
2. **Contract Reading**: Querying dynamic contract structs with `getAllMarkets()` and calculating proportional odds percentages.
3. **Contract Writing & ETH Transfers**: Sending native ETH as `msg.value` in `placeBet()` and claiming payouts via `claimWinnings()`.
4. **Real-time Event Subscriptions**: Listening to `MarketCreated`, `BetPlaced`, and `MarketResolved` events using Ethers `contract.on()`.
5. **Error Management**: Catching user cancellations (`ACTION_REJECTED`), closed markets, and contract reverts gracefully.

---

## 📁 Repository Structure

```text
ethers-masterclass-prediction/
├── contracts/
│   └── PredictionMarketOracleHub.sol   # Solidity Smart Contract (Pre-deployed)
├── scripts/
│   └── deploy.js                       # Optional deployment script
├── hardhat.config.js                   # Hardhat config (Sepolia & Localhost)
└── frontend/
    ├── src/
    │   ├── components/                 # Pre-built Stripe/Linear Light UI Components
    │   ├── contracts/                  # Pre-configured contract address & ABIs (predictionConfig.ts)
    │   ├── types/                      # TypeScript interfaces (prediction.ts)
    │   ├── hooks/
    │   │   └── useWeb3Prediction.ts     # 👈 YOUR MAIN IMPLEMENTATION TARGET
    │   └── App.tsx
    └── package.json
```

---

## 💻 Student Quick-Start Guide (3 Steps)

### 1️⃣ Step 1: Install Dependencies
Open your terminal in the `frontend` folder and install packages:
```bash
cd frontend
npm install
```

### 2️⃣ Step 2: Implement Your Web3 Hooks
Open `frontend/src/hooks/useWeb3Prediction.ts` and write your Ethers.js v6 logic:
- **`connectWallet()`**: Connect MetaMask / EIP-6963 wallet via `BrowserProvider`.
- **`fetchMarkets()`**: Query `getAllMarkets()` and calculate connected user positions.
- **`placeBet(marketId, isYes, amountEth)`**: Pass `parseEther(amountEth)` as `{ value }` in `contract.placeBet()`.
- **`claimWinnings(marketId)`**: Call `contract.claimWinnings(marketId)` when market is resolved.
- **`contract.on()`**: Listen to live contract events to update market odds in real-time.

### 3️⃣ Step 3: Run the App
Launch the dev server:
```bash
npm run dev
```
Navigate to `http://localhost:5173` and test your prediction market! 🎯
