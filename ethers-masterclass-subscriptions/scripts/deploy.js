const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying Subscription Vault to network:", hre.network.name);
  console.log("🔑 Deployer address:", deployer.address);

  const SubscriptionVault = await hre.ethers.getContractFactory("DecentralizedSubscriptionVault");
  const vault = await SubscriptionVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("✅ DecentralizedSubscriptionVault deployed to:", vaultAddress);

  // Seed initial subscription plans
  console.log("⏳ Seeding initial SaaS subscription plans...");
  let tx = await vault.createPlan("Web3 Node Infrastructure Basic", hre.ethers.parseEther("0.01"), 2592000); // 0.01 ETH / 30 days
  await tx.wait();
  tx = await vault.createPlan("Enterprise AI API Stream Pro", hre.ethers.parseEther("0.05"), 2592000); // 0.05 ETH / 30 days
  await tx.wait();

  console.log("\n=================== DEPLOYMENT SUMMARY ===================");
  console.log(`Network:                ${hre.network.name}`);
  console.log(`Vault Address:          ${vaultAddress}`);
  console.log("==========================================================");

  if (hre.network.name === "sepolia") {
    console.log("\n🔍 To verify on Etherscan run:");
    console.log(`npx hardhat verify --network sepolia ${vaultAddress}`);
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
