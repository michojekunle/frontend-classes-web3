# Price Feed Farcaster Frame

This is a Farcaster Frame for dynamic and interactive price feed. The frame will provide latest price updates for Ethereum (ETH) and Bitcoin (BTC) in an engaging and visually appealing manner.

## Project Overview

The project consists of the following key components:

-   **API Routes**: The `src/app/api/price/route.ts` file defines API routes for fetching and processing price data for ETH and BTC.
-   **Image Generation**: The `src/utils/image.ts` file includes functions for generating images representing price data.
-   **Price Data**: The `src/utils/price.ts` file contains functions for fetching price data for ETH and BTC.

## Dependencies

The project uses the following dependencies:

-   `axios`: For making API requests to the subgraph endpoint.
-   `satori`: For converting HTML and CSS to svg
-   `sharp`: For converting SVG images to PNG.

## Getting Started

To run the project locally, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/AjayiMike/price-feed-farcaster-frame
```

2. rename `env.example` to `.env` and set your **SUBGRAPH_API_KEY**

3. Install dependencies:

```bash
cd farcaster-frame
npm install
or
yarn install
or
pnpm install
```

4. Start the development server:

```bash
npm run dev
or
yarn dev
or
pnpm dev
```

5. Test the frame at using framegear or any local frame tester

6. Once satisfied, deploy and test using warpcast frame tester
