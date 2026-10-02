import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
import { PoolData } from "../types/staking";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  formatEther,
  formatUnits,
  Interface,
  isAddress,
  parseEther,
  parseUnits,
  ZeroAddress,
} from "ethers";

export const useStakingVault = (
  walletAddress: string | null,
  walletChainId: number | null,
) => {
  const {
    wallet: { address, chainId },
    browserProvider,
    validateChainId,
    isSupportedChain: hookIsSupportedChain,
  } = useWalletConnection();
  const { getContract } = useContract();
  const { vault, mgo, stk, multicall2 } = CONTRACTS;
  const [pools, setPools] = useState<PoolData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // TODO FOR CLASS:
  // 1. Instantiate read-only Contract or Signer-connected Contract
  const vaultContract = useMemo(
    () => getContract(vault.address, vault.abi, true),
    [getContract],
  );
  const mgoContract = useMemo(
    () => getContract(mgo.address, mgo.abi, true),
    [getContract],
  );
  const multicall2Contract = useMemo(
    () => getContract(multicall2.address, multicall2.abi, true),
    [getContract],
  );
  const stkContract = useMemo(
    () => getContract(stk.address, stk.abi, true),
    [getContract],
  );

  // define the interface
  const intfce = useMemo(() => new Interface(vault.abi), []);

  const validAddress = useMemo(
    () => (isAddress(walletAddress) ? walletAddress : ZeroAddress),
    [walletAddress],
  );
  const isSupportedChain =
    walletChainId !== null ? walletChainId === 11155111 : hookIsSupportedChain;

  // 2. Fetch pool count and iterate over poolInfo
  const getStakingPools = useCallback(
    async (
      contract: Contract,
      vaultContract: Contract,
      mgoContract: Contract,
      stkContract: Contract,
      vault: { address: string; abi: any },
    ) => {
      console.log("Helloooooooo");
      // Get pool length
      const poolLength = await vaultContract.poolLength();
      // Fetch Token Symbols and Decimals
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
        }),
      );

      const userInfoCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i,
      ).map((id: number) => ({
        target: vault.address,
        callData: intfce.encodeFunctionData("userInfo", [id, validAddress]),
      }));

      const pendingRewardCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i,
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
        intfce.decodeFunctionResult("poolInfo", result),
      );

      const decodedUserInfo = userInfoResult.map((result: string) =>
        intfce.decodeFunctionResult("userInfo", result),
      );

      const decodedPendingRewards = pendingRewardResult.map((result: string) =>
        intfce.decodeFunctionResult("pendingReward", result),
      );

      console.log("Decoded Pools", decodedPools);
      console.log("decodedUserInfo", decodedUserInfo);
      console.log("decodedPendindRewards", decodedPendingRewards);

      const fetchedPools = decodedPools.map((proxy: any, idx: number) => ({
        poolId: idx,
        stakingTokenAddress: String(proxy.stakingToken),
        rewardRatePerSecond: formatUnits(
          proxy.rewardRatePerSecond,
          mgoDecimals,
        ),
        lastRewardTime: Number(proxy.lastRewardTime),
        accRewardPerShare: Number(proxy.accRewardPerShare),
        totalStaked: formatUnits(
          proxy.totalStaked,
          proxy.isEthPool ? 18 : stkDecimals,
        ),
        isEthPool: proxy.isEthPool,
        tokenSymbol: proxy.isEthPool ? "ETH" : stkTokenSymbol,
        tokenDecimals: proxy.isEthPool ? 18 : Number(stkDecimals),
        userStakedAmount: formatUnits(
          decodedUserInfo[idx].amount,
          proxy.isEthPool ? 18 : stkDecimals,
        ),
        userPendingReward: formatUnits(
          decodedPendingRewards[idx][0],
          mgoDecimals,
        ),
        userTokenBalance: formatUnits(userTokenBalance, stkDecimals),
      }));

      setPools(fetchedPools);
    },
    [intfce, validAddress],
  );

  const refreshPools = useCallback(async () => {
    if (!multicall2Contract || !vaultContract || !mgoContract || !stkContract) {
      throw new Error("Required staking contracts are unavailable.");
    }

    await getStakingPools(
      multicall2Contract,
      vaultContract,
      mgoContract,
      stkContract,
      vault,
    );
  }, [
    getStakingPools,
    multicall2Contract,
    vaultContract,
    mgoContract,
    stkContract,
    vault,
  ]);

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
      throw new Error("VaultContract is missing");
    }

    if (!multicall2Contract) {
      throw new Error("Multicall2Contract is missing");
    }

    if (!mgoContract) {
      throw new Error("mgoContract is missing");
    }

    if (!stkContract) {
      throw new Error("stkContract is missing");
    }

    if (!isSupportedChain) {
      throw new Error("Chain is not supported");
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
          vault,
        );
      } catch (error: any) {
        setError(
          error && error.message
            ? error.message
            : "Failed to fetch staking pools; an unexpected error occured while fetching staking pools.",
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
    isEth: boolean,
  ) => {
    if (!vaultContract) {
      throw new Error("Staking vault contract is unavailable.");
    }

    if (!address) {
      throw new Error("Connect your wallet before staking.");
    }

    if (!isSupportedChain) {
      throw new Error("Switch to a supported network before staking.");
    }

    if (!amount.trim() || Number(amount) <= 0) {
      throw new Error("Enter a staking amount greater than zero.");
    }

    if (isEth) {
      if (!browserProvider) {
        throw new Error("Wallet provider is unavailable.");
      }

      const value = parseEther(amount);
      const balance = await browserProvider.getBalance(address);

      if (value >= balance) {
        throw new Error(
          `Insufficient Sepolia ETH balance. You entered ${amount} ETH, but only ${formatEther(balance)} ETH is available before gas.`,
        );
      }

      const transaction = await vaultContract.stake(poolId, 0, {
        value,
      });

      await transaction.wait();
      await refreshPools();
      return;
    }

    if (!stkContract) {
      throw new Error("Staking token contract is unavailable.");
    }

    const decimals = Number(await stkContract.decimals());
    const parsedAmount = parseUnits(amount, decimals);
    const allowance = await stkContract.allowance(address, vault.address);

    if (allowance < parsedAmount) {
      const approval = await stkContract.approve(vault.address, parsedAmount);
      await approval.wait();
    }

    const transaction = await vaultContract.stake(poolId, parsedAmount);
    await transaction.wait();
    await refreshPools();
  };

  const withdrawTokens = async (poolId: number, amount: string) => {
    if (!vaultContract) {
      throw new Error("Staking vault contract is unavailable.");
    }

    if (!address) {
      throw new Error("Connect your wallet before withdrawing.");
    }

    if (!isSupportedChain) {
      throw new Error("Switch to a supported network before withdrawing.");
    }

    if (!amount.trim() || Number(amount) <= 0) {
      throw new Error("Enter a withdrawal amount greater than zero.");
    }

    const pool = await vaultContract.poolInfo(poolId);
    let parsedAmount: bigint;

    if (pool.isEthPool) {
      parsedAmount = parseEther(amount);
    } else {
      if (!stkContract) {
        throw new Error("Staking token contract is unavailable.");
      }

      parsedAmount = parseUnits(amount, Number(await stkContract.decimals()));
    }

    const transaction = await vaultContract.withdraw(poolId, parsedAmount);
    await transaction.wait();
    await refreshPools();
  };

  const claimRewards = async (poolId: number) => {
    if (!vaultContract) {
      throw new Error("Staking vault contract is unavailable.");
    }

    if (!address) {
      throw new Error("Connect your wallet before claiming rewards.");
    }

    if (!isSupportedChain) {
      throw new Error("Switch to Sepolia before claiming rewards.");
    }

    const transaction = await vaultContract.claimReward(poolId);
    await transaction.wait();

    await refreshPools();
  };

  const mintTestTokens = async () => {
    if (!stkContract) {
      throw new Error("Staking token contract is unavailable.");
    }

    if (!address) {
      throw new Error("Connect your wallet before requesting test tokens.");
    }

    if (!isSupportedChain) {
      throw new Error(
        "Switch to a supported network before requesting test tokens.",
      );
    }

    const decimals = await stkContract.decimals();
    const amount = parseUnits("100", decimals);
    const transaction = await stkContract.faucet(amount);

    await transaction.wait();
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
