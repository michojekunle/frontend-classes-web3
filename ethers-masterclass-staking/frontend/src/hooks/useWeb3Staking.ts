import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS, MINT_ABI } from "../contracts/stakingConfig";
import { PoolData } from "../types/staking";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  formatUnits,
  Interface,
  isAddress,
  parseUnits,
  ZeroAddress,
} from "ethers";

export const useStakingVault = (walletAddress: string | null) => {
  const {
    wallet: { address, chainId },
    validateChainId,
    isSupportedChain,
  } = useWalletConnection();
  const { getContract } = useContract();
  const { vault, mgo, stk, multicall2 } = CONTRACTS;
  const [pools, setPools] = useState<PoolData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
  // TODO FOR CLASS:
  // 1. Instantiate read-only Contract or Signer-connected Contract
  const vaultContract = useMemo(
    () => getContract(vault.address, vault.abi, true),
    [getContract]
  );
  const mgoContract = useMemo(
    () => getContract(mgo.address, mgo.abi, true),
    [getContract]
  );
  const multicall2Contract = useMemo(
    () => getContract(multicall2.address, multicall2.abi, true),
    [getContract]
  );
  const stkContract = useMemo(
    () => getContract(stk.address, stk.abi, true),
    [getContract]
  );

  // define the interface
  const intfce = useMemo(() => new Interface(vault.abi), []);

  const validAddress = useMemo(
    () => (isAddress(walletAddress) ? walletAddress : ZeroAddress),
    []
  );

  // 2. Fetch pool count and iterate over poolInfo
  const getStakingPools = useCallback(
    async (
      contract: Contract,
      vaultContract: Contract,
      mgoContract: Contract,
      stkContract: Contract,
      vault: { address: string; abi: any }
    ) => {
      console.log("Helloooooooo");
      let pools: PoolData[] = [];

      // Get pool length
      const poolLength = await vaultContract.poolLength();
      // Fetch Token Symbols and Decimals
      const mgoTokenSymbol = await mgoContract.symbol();
      const mgoDecimals = await mgoContract.decimals();
      const stkTokenSymbol = await stkContract.symbol();
      const stkDecimals = await stkContract.decimals();

      //fetch token balance
      const userTokenBalance = await stkContract.balanceOf(validAddress);

      console.log("Pool Length: ", poolLength);

      if (!poolLength || poolLength == 0) {
        return [];
      }

      // define the calls
      const calls = Array.from({ length: Number(poolLength) }, (_, i) => i).map(
        (id: number) => ({
          target: vault.address,
          callData: intfce.encodeFunctionData("poolInfo", [id]),
        })
      );

      const userInfoCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).map((id: number) => ({
        target: vault.address,
        callData: intfce.encodeFunctionData("userInfo", [id, validAddress]),
      }));

      const pendingRewardCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).map((id: number) => ({
        target: vault.address,
        callData: intfce.encodeFunctionData("pendingReward", [
          id,
          validAddress,
        ]),
      }));

      //make the aggregate calls
      const [poolsResponse, userInfoResponse, pendingRewardResponse] =
        await Promise.all([
          contract.aggregate.staticCall(calls),
          contract.aggregate.staticCall(userInfoCalls),
          contract.aggregate.staticCall(pendingRewardCalls),
        ]);

      const [_, poolsResult] = poolsResponse;
      const [__, userInfoResult] = userInfoResponse;
      const [___, pendingRewardResult] = pendingRewardResponse;

      console.log("Undecoded Pool results:::::", poolsResult);
      console.log("Undecoded userInfo results:::::", userInfoResult);
      console.log("Undecoded pendingRewards results:::::", pendingRewardResult);

      // decode the results of the aggregate calls
      const decodedPools = poolsResult.map((result: string) =>
        intfce.decodeFunctionResult("poolInfo", result)
      );

      const decodedUserInfo = userInfoResult.map((result: string) =>
        intfce.decodeFunctionResult("userInfo", result)
      );

      const decodedPendingRewards = pendingRewardResult.map((result: string) =>
        intfce.decodeFunctionResult("pendingReward", result)
      );

      console.log("Decoded Pools", decodedPools);
      console.log("decodedUserInfo", decodedUserInfo);
      console.log("decodedPendindRewards", decodedPendingRewards);

      const fetchedPools = decodedPools.map((proxy: any, idx: number) => ({
        poolId: idx,
        stakingTokenAddress: String(proxy.stakingToken),
        rewardRatePerSecond: formatUnits(
          proxy.rewardRatePerSecond,
          mgoDecimals
        ),
        lastRewardTime: Number(proxy.lastRewardTime),
        accRewardPerShare: Number(proxy.accRewardPerShare),
        totalStaked: formatUnits(proxy.totalStaked, stkDecimals),
        isEthPool: proxy.isEthPool,
        tokenSymbol: proxy.isEthPool ? "ETH" : stkTokenSymbol,
        tokenDecimals: Number(mgoDecimals),
        userStakedAmount: formatUnits(decodedUserInfo[idx].amount, stkDecimals),
        userPendingReward: formatUnits(
          decodedPendingRewards[idx][0],
          mgoDecimals
        ),
        userTokenBalance: formatUnits(userTokenBalance, stkDecimals),
      }));

      setPools(fetchedPools);
    },
    []
  );

  useEffect(() => {
    console.log("POOL EFFECT:", {
      vaultContract,
      multicall2Contract,
      mgoContract,
      stkContract,
      vault,
      chainId,
      walletAddress,
      isSupported: isSupportedChain,
    });

    console.log("CHECKS:", {
      vaultContract: !!vaultContract,
      multicall2Contract: !!multicall2Contract,
      mgoContract: !!mgoContract,
      stkContract: !!stkContract,
      isSupportedChain,
    });

    if (!vaultContract) {
      console.log("❌ vaultContract is missing");
      return;
    }

    if (!multicall2Contract) {
      console.log("❌ multicall2Contract is missing");
      return;
    }

    if (!mgoContract) {
      console.log("❌ mgoContract is missing");
      return;
    }

    if (!stkContract) {
      console.log("❌ stkContract is missing");
      return;
    }

    if (!isSupportedChain) {
      console.log("❌ Chain is not supported");
      return;
    }

    const run = async () => {
      console.log("Fetching poolssssssss!");

      try {
        setIsLoading(true);
        await getStakingPools(
          multicall2Contract,
          vaultContract,
          mgoContract,
          stkContract,
          vault
        );
      } catch (error: any) {
        setError(
          error && error.message
            ? error.message
            : "Failed to fetch staking pools; an unexpected error occured while fetching staking pools."
        );
      } finally {
        setIsLoading(false);
      }

      console.log("Doneee Fetching poolssssssss!");
    };

    run();
  }, [
    vaultContract,
    multicall2Contract,
    mgoContract,
    stkContract,
    isSupportedChain,
    vault,
    getStakingPools,
  ]);

  // 3. Fetch token symbol and decimals using ERC20 contract instance
  // 4. Perform Multicall/Promise.all for pendingReward and userInfo
  
  // 5. Setup Ethers event listeners (vaultContract.on('Staked', ...)) for live UI updates
  // 6. Handle errors (user rejection, insufficient allowance, execution revert)
  
const stakeTokens = async (
  poolId: number,
  amount: string,
  isEth: boolean
) => {
  try {
    if (!address) throw new Error("Connect your wallet first");

    if (!amount || Number(amount) <= 0) {
      throw new Error("Enter a valid staking amount");
    }

    if (!vaultContract || !multicall2Contract || !mgoContract || !stkContract) {
      throw new Error("Staking contracts are unavailable. Check your network.");
    }

    const signerVault = getContract(vault.address, vault.abi, true);
    const signerToken = isEth
      ? undefined
      : getContract(stk.address, stk.abi, true);
    if (!signerVault || (!isEth && !signerToken)) {
      throw new Error(
        "Unable to initialize contracts. Connect your wallet and try again."
      );
    }

    const tokenDecimals = isEth
      ? 18
      : Number(await signerToken!.decimals());
    const parsedAmount = parseUnits(amount, tokenDecimals);

    if (!isEth) {
      const allowance = await signerToken!.allowance(address, vault.address);
      if (allowance < parsedAmount) {
        const approveTx = await signerToken!.approve(
          vault.address,
          parsedAmount
        );
        await approveTx.wait();
      }
    }

    const tx = isEth
      ? await signerVault.stake(poolId, parsedAmount, {
          value: parsedAmount,
        })
      : await signerVault.stake(poolId, parsedAmount);

    await tx.wait();

    // Refresh pool data after the transaction.
    await getStakingPools(
         multicall2Contract,

      vaultContract,
      mgoContract,
      stkContract,
      vault
    );
  } catch (err: any) {
    console.error("Stake failed:", err);
    throw new Error(
      err?.shortMessage || err?.reason || err?.message || "Staking failed"
    );
  }
};


const withdrawTokens = async (
  poolId: number,
  amount: string
) => {
  try {
    if (!address) throw new Error("Connect your wallet first");

    if (!amount || Number(amount) <= 0) {
      throw new Error("Enter a valid withdrawal amount");
    }

    if (!vaultContract || !multicall2Contract || !mgoContract || !stkContract) {
      throw new Error("Staking contracts are unavailable. Check your network.");
    }

    const signerVault = getContract(vault.address, vault.abi, true);
    if (!signerVault) {
      throw new Error("Unable to initialize the vault. Connect your wallet and try again.");
    }

    const poolInfo = await signerVault.poolInfo(poolId);
    const signerToken = poolInfo.isEthPool
      ? undefined
      : getContract(poolInfo.stakingToken, stk.abi, true);
    if (!poolInfo.isEthPool && !signerToken) {
      throw new Error("Unable to initialize the staking token contract.");
    }

    const decimals = poolInfo.isEthPool
      ? 18
      : Number(await signerToken!.decimals());
    const parsedAmount = parseUnits(amount, decimals);

    const withdrawTx = await signerVault.withdraw(poolId, parsedAmount);
    await withdrawTx.wait();

    await getStakingPools(
      multicall2Contract,
      vaultContract,
      mgoContract,
      stkContract,
      vault
    );
  } catch (err: any) {
    console.error("Withdrawal failed:", err);
    throw new Error(
      err?.shortMessage || err?.reason || err?.message || "Withdrawal failed"
    );
  }
};

const claimRewards = async (poolId: number) => {
  try {
    if (!address) throw new Error("Connect your wallet first");

    if (!vaultContract || !multicall2Contract || !mgoContract || !stkContract) {
      throw new Error("Staking contracts are unavailable. Check your network.");
    }

    const signerVault = getContract(vault.address, vault.abi, true);
    if (!signerVault) {
      throw new Error("Unable to initialize the vault. Connect your wallet and try again.");
    }

    const ClaimRewards = await signerVault.claimReward(poolId);
    await ClaimRewards.wait();

    await getStakingPools(
      multicall2Contract,
      vaultContract,
      mgoContract,
      stkContract,
      vault
    );
  } catch (err: any) {
    console.error("Claim rewards failed:", err);
    throw new Error(
      err?.shortMessage || err?.reason || err?.message || "Reward claim failed"
    );
  }
};

const mintTestTokens = async () => {
  try {
    if (!address) throw new Error("Connect your wallet first");

    if (!vaultContract || !multicall2Contract || !mgoContract || !stkContract) {
      throw new Error("Staking contracts are unavailable. Check your network.");
    }

    const signerToken = getContract(
      stk.address,
      // [
      //   "function decimals() view returns (uint8)",
      //   "function faucet(uint256 amount)",
      // ],
      // 
      MINT_ABI,
      true
    );
    if (!signerToken) {
      throw new Error("Unable to initialize the token. Connect your wallet and try again.");
    }

    const mintAmount = parseUnits("100", Number(await signerToken.decimals()));
    const MintTx = await signerToken.faucet(mintAmount);
    await MintTx.wait();

    await getStakingPools(
      multicall2Contract,
      vaultContract,
      mgoContract,
      stkContract,
      vault
    );
  } catch (err: any) {
    console.error("Mint test tokens failed:", err);
    throw new Error(
      err?.shortMessage || err?.reason || err?.message || "Token mint failed"
    );
  }
};


  return {
    pools,
    isLoading,
    error,
    stakeTokens,
    withdrawTokens,
    claimRewards,
    mintTestTokens,
  };
};
