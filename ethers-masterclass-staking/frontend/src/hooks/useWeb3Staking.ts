import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
import { PoolData } from "../types/staking";
import { jsonRpcProvider, useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  formatUnits,
  parseUnits,
  parseEther,
  Interface,
  isAddress,
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
  const [error, setError] = useState(false);

  // TODO FOR CLASS:
  // 1. Instantiate read-only Contract or Signer-connected Contract
  // getContract(address, abi, withSigner): false = read-only (RPC provider), true = signer-connected (can send transactions)
  const vaultContract = useMemo(
    () => getContract(vault.address, vault.abi, false),
    [getContract]
  );

  const vaultWriteContract = useMemo(
    () => getContract(vault.address, vault.abi, true),
    [getContract]
  );
  const mgoContract = useMemo(
    () => getContract(mgo.address, mgo.abi, false),
    [getContract]
  );
  const multicall2Contract = useMemo(
    () => getContract(multicall2.address, multicall2.abi, false),
    [getContract]
  );
  const stkContract = useMemo(
    () => getContract(stk.address, stk.abi, false),
    [getContract]
  );

  const stkWriteContract = useMemo(
    () => getContract(stk.address, stk.abi, true),
    [getContract]
  );

  // define the interface
  const intfce = useMemo(() => new Interface(vault.abi), []);

  const validAddress = useMemo(
    () => (walletAddress && isAddress(walletAddress) ? walletAddress : ZeroAddress),
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

      //fetch token balances
      const userTokenBalance = await stkContract.balanceOf(validAddress);
      const userEthBalance = await jsonRpcProvider.getBalance(validAddress);

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
        userTokenBalance: proxy.isEthPool
          ? formatUnits(userEthBalance, 18)
          : formatUnits(userTokenBalance, stkDecimals),
      }));

      setPools(fetchedPools);
    },
    [validAddress, intfce]
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

  const refreshPools = async () => {
    if (!multicall2Contract || !vaultContract || !mgoContract || !stkContract) {
      return;
    }

    await getStakingPools(
      multicall2Contract,
      vaultContract,
      mgoContract,
      stkContract,
      vault
    );
  };

  // 3. Fetch token symbol and decimals using ERC20 contract instance
  // 4. Perform Multicall/Promise.all for pendingReward and userInfo

  // 5. Setup Ethers event listeners (vaultContract.on('Staked', ...)) for live UI updates
  // 6. Handle errors (user rejection, insufficient allowance, execution revert)

  const stakeTokens = async (
    poolId: number,
    amount: string,
    isEth: boolean
  ) => {
    // getContract can return undefined (e.g. wallet not connected yet),
    // so check before using any of them. After this check TypeScript
    // knows they are defined.
    if (!vaultWriteContract || !stkWriteContract || !stkContract || !address) {
      throw new Error("Please connect your wallet first.");
    }

    if (isEth) {
      const parsedETH = parseEther(amount);

      const stakeTx = await vaultWriteContract.stake(poolId, parsedETH, {
        value: parsedETH,
      });
      await stakeTx.wait();
      await refreshPools();
      return;
    }

    
    const stkDecimals = await stkContract.decimals();
    const parsedAmount = parseUnits(amount, stkDecimals);

    const allowance = await stkContract.allowance(address, vault.address);
    if (allowance < parsedAmount) {
      const approveTx = await stkWriteContract.approve(
        vault.address,
        parsedAmount
      );
      await approveTx.wait();
    }

    const stakeTx = await vaultWriteContract.stake(poolId, parsedAmount);
    await stakeTx.wait();
    await refreshPools();
  };

  const withdrawTokens = async (poolId: number, amount: string, isEth: boolean) => {
  if (!vaultWriteContract || !stkContract) {
    throw new Error("Please connect your wallet first.");
  }

  let parsedAmount;
  
  if (isEth) {
    parsedAmount = parseEther(amount);
  } else {
    parsedAmount = parseUnits(amount, await stkContract.decimals());
  }

  

  const withdrawTx = await vaultWriteContract.withdraw(poolId, parsedAmount);
  await withdrawTx.wait();
  await refreshPools();
};

  const claimRewards = async (poolId: number) => {
    if (!vaultWriteContract) {
      throw new Error("Please connect your wallet first.");
    }

    const claimTx = await vaultWriteContract.claimReward(poolId);
    await claimTx.wait();
    await refreshPools();
  };

  const mintTestTokens = async () => {
    if (!stkWriteContract || !stkContract) {
      throw new Error("Please connect your wallet first.");
    }

    const stkDecimals = await stkContract.decimals();
    const parsedAmount = parseUnits("100", stkDecimals);

    const mintTx = await stkWriteContract.faucet(parsedAmount);
    await mintTx.wait();
    await refreshPools();
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