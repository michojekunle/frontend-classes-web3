const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying Staking Vault to network:", hre.network.name);
  console.log("🔑 Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // 1. Deploy Reward Token (MGO - MasterGov Token)
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const rewardToken = await MockERC20.deploy("MasterGov Token", "MGO");
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("✅ RewardToken (MGO) deployed to:", rewardTokenAddress);

  // 2. Deploy Staking Token (STK - Staking Token)
  const stakingToken = await MockERC20.deploy("Staking Token", "STK");
  await stakingToken.waitForDeployment();
  const stakingTokenAddress = await stakingToken.getAddress();
  console.log("✅ StakingToken (STK) deployed to:", stakingTokenAddress);

  // 3. Deploy MultiTokenStakingVault
  const Vault = await hre.ethers.getContractFactory("MultiTokenStakingVault");
  const vault = await Vault.deploy(rewardTokenAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ MultiTokenStakingVault deployed to:", vaultAddress);

  // 4. Fund Vault with Reward Tokens (500,000 MGO)
  const fundAmount = hre.ethers.parseEther("500000");
  console.log("⏳ Funding Vault with rewards...");
  let tx = await rewardToken.approve(vaultAddress, fundAmount);
  await tx.wait();
  tx = await vault.fundRewardPool(fundAmount);
  await tx.wait();
  console.log("✅ Vault funded successfully!");

  // 5. Add Pools (Pool 0: Native ETH, Pool 1: STK ERC20 Token)
  const rewardRate = hre.ethers.parseEther("0.1"); // 0.1 MGO / second
  console.log("⏳ Creating Staking Pools...");
  tx = await vault.addPool(hre.ethers.ZeroAddress, rewardRate, true); // Pool 0: ETH
  await tx.wait();
  tx = await vault.addPool(stakingTokenAddress, rewardRate, false); // Pool 1: STK
  await tx.wait();
  console.log("✅ Pools initialized!");

  console.log("\n=================== DEPLOYMENT SUMMARY ===================");
  console.log(`Network:                ${hre.network.name}`);
  console.log(`Vault Address:          ${vaultAddress}`);
  console.log(`Reward Token (MGO):     ${rewardTokenAddress}`);
  console.log(`Staking Token (STK):    ${stakingTokenAddress}`);
  console.log("==========================================================");

  // Verification instructions for Sepolia
  if (hre.network.name === "sepolia") {
    console.log("\n🔍 To verify on Etherscan run:");
    console.log(`npx hardhat verify --network sepolia ${rewardTokenAddress} "MasterGov Token" "MGO"`);
    console.log(`npx hardhat verify --network sepolia ${stakingTokenAddress} "Staking Token" "STK"`);
    console.log(`npx hardhat verify --network sepolia ${vaultAddress} "${rewardTokenAddress}"`);
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
