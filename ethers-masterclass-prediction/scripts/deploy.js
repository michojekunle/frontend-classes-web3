const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying Prediction Market Oracle Hub to network:", hre.network.name);
  console.log("🔑 Deployer address:", deployer.address);

  const PredictionHub = await hre.ethers.getContractFactory("PredictionMarketOracleHub");
  const hub = await PredictionHub.deploy();
  await hub.waitForDeployment();
  const hubAddress = await hub.getAddress();

  console.log("✅ PredictionMarketOracleHub deployed to:", hubAddress);

  // Seed initial markets
  console.log("⏳ Seeding sample prediction markets...");
  let tx = await hub.createMarket("Will ETH reach $4,500 by end of quarter?", "Crypto & DeFi", 7200);
  await tx.wait();
  tx = await hub.createMarket("Will Gemini 3.5 Ultra rank #1 on Chatbot Arena?", "AI & Tech", 86400);
  await tx.wait();
  tx = await hub.createMarket("Will Ethereum average gas drop below 5 Gwei this week?", "Ethereum", 259200);
  await tx.wait();

  console.log("\n=================== DEPLOYMENT SUMMARY ===================");
  console.log(`Network:                ${hre.network.name}`);
  console.log(`Hub Address:            ${hubAddress}`);
  console.log("==========================================================");

  if (hre.network.name === "sepolia") {
    console.log("\n🔍 To verify on Etherscan run:");
    console.log(`npx hardhat verify --network sepolia ${hubAddress}`);
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
