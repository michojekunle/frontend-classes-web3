import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
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
    [walletAddress]
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
    [intfce, validAddress]
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

  const waitForConfirmation = async (transaction: { wait: () => Promise<any> }) => {
    const receipt = await transaction.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction was not confirmed successfully.");
    }
  };

  const refreshPools = async () => {
    if (!vaultContract || !multicall2Contract || !mgoContract || !stkContract) {
      return;
    }

    try {
      await getStakingPools(
        multicall2Contract,
        vaultContract,
        mgoContract,
        stkContract,
        vault
      );
    } catch (refreshError: unknown) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Unknown error";
      setError(`Transaction confirmed, but pool data failed to refresh: ${message}`);
    }
  };

  const stakeTokens = async (
    poolId: number,
    amount: string,
    isEth: boolean
  ) => {
    setError(null);
    try {
      if (!vaultContract || !address) {
        throw new Error("Connect a wallet before staking.");
      }

      const pool = await vaultContract.poolInfo(poolId);
      const isEthPool = Boolean(pool.isEthPool);
      if (isEthPool !== isEth) {
        throw new Error("The selected pool type does not match its configuration.");
      }

      let amountInUnits: bigint;
      let transaction;

      if (isEthPool) {
        amountInUnits = parseUnits(amount, 18);
        if (amountInUnits <= 0n) {
          throw new Error("Enter an amount greater than zero.");
        }
        transaction = await vaultContract.stake(poolId, amountInUnits, {
          value: amountInUnits,
        });
      } else {
        const poolToken = getContract(String(pool.stakingToken), stk.abi, true);
        if (!poolToken) {
          throw new Error("Unable to connect to the pool's staking token.");
        }

        const decimals = Number(await poolToken.decimals());
        amountInUnits = parseUnits(amount, decimals);
        if (amountInUnits <= 0n) {
          throw new Error("Enter an amount greater than zero.");
        }

        const allowance = await poolToken.allowance(address, vault.address);
        if (allowance < amountInUnits) {
          const approval = await poolToken.approve(vault.address, amountInUnits);
          await waitForConfirmation(approval);
        }

        transaction = await vaultContract.stake(poolId, amountInUnits);
      }

      await waitForConfirmation(transaction);
      await refreshPools();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Stake transaction failed.");
      throw error;
    }
  };

  const withdrawTokens = async (poolId: number, amount: string) => {
    setError(null);
    try {
      if (!vaultContract || !address) {
        throw new Error("Connect a wallet before withdrawing.");
      }

      const pool = await vaultContract.poolInfo(poolId);
      const isEthPool = Boolean(pool.isEthPool);
      let decimals = 18;

      if (!isEthPool) {
        const poolToken = getContract(String(pool.stakingToken), stk.abi, true);
        if (!poolToken) {
          throw new Error("Unable to connect to the pool's staking token.");
        }
        decimals = Number(await poolToken.decimals());
      }

      const amountInUnits = parseUnits(amount, decimals);
      if (amountInUnits <= 0n) {
        throw new Error("Enter an amount greater than zero.");
      }

      const transaction = await vaultContract.withdraw(poolId, amountInUnits);
      await waitForConfirmation(transaction);
      await refreshPools();
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Withdraw transaction failed."
      );
      throw error;
    }
  };

  const claimRewards = async (poolId: number) => {
    console.log("Class TODO: Call vault.claimReward() and handle tx response");
  };

  const mintTestTokens = async () => {
    console.log("Class TODO: Call ERC20 faucet() for instant testing tokens");
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
