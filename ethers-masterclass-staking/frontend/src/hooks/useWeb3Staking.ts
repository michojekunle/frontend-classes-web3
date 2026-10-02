import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
import { PoolData } from "../types/staking";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  JsonRpcSigner,
  ContractTransactionResponse,
  formatUnits,
  Interface,
  isAddress,
  isError,
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
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const mintInProgress = useRef(false);
  const transactionInProgress = useRef(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const walletContext = `${walletAddress}:${chainId}`;
  const currentContext = useRef(walletContext);
  currentContext.current = walletContext;

  useEffect(() => {
    setMintStatus(null);
    setTransactionStatus(null);
    setError(null);
    setPools([]);
  }, [walletContext]);

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

      // Get pool length
      const poolLength = await vaultContract.poolLength();
      const mgoDecimals = await mgoContract.decimals();

      console.log("Pool Length: ", poolLength);

      if (!poolLength || poolLength == 0) {
        if (currentContext.current === walletContext) setPools([]);
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

      const fetchedPools: PoolData[] = await Promise.all(decodedPools.map(async (proxy: any, idx: number) => {
        // Each pool uses its own staking asset's units; rewards use MGO units.
        const token = new Contract(proxy.stakingToken, stk.abi, vaultContract.runner);
        const decimals = proxy.isEthPool ? 18 : Number(await token.decimals());
        const [symbol, balance, allowance] = proxy.isEthPool
          ? ["ETH", await vaultContract.runner!.provider!.getBalance(validAddress), 0n]
          : await Promise.all([
              token.symbol(), token.balanceOf(validAddress),
              token.allowance(validAddress, vault.address),
            ]);
        return {
          poolId: idx,
          stakingTokenAddress: String(proxy.stakingToken),
          rewardRatePerSecond: formatUnits(proxy.rewardRatePerSecond, mgoDecimals),
          lastRewardTime: Number(proxy.lastRewardTime),
          accRewardPerShare: String(proxy.accRewardPerShare),
          totalStaked: formatUnits(proxy.totalStaked, decimals),
          isEthPool: proxy.isEthPool,
          tokenSymbol: String(symbol),
          tokenDecimals: decimals,
          userStakedAmount: formatUnits(decodedUserInfo[idx].amount, decimals),
          userPendingReward: formatUnits(decodedPendingRewards[idx][0], mgoDecimals),
          userTokenBalance: formatUnits(balance, decimals),
          userAllowance: formatUnits(allowance, decimals),
        };
      }));

      if (currentContext.current === walletContext) setPools(fetchedPools);
    },
    [validAddress, intfce, walletContext]
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
        if (currentContext.current === walletContext) setError(
          error && error.message
            ? error.message
            : "Failed to fetch staking pools; an unexpected error occured while fetching staking pools."
        );
      } finally {
        if (currentContext.current === walletContext) setIsLoading(false);
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

  // Accept a sped-up transaction only when it still represents the same call.
  const waitForTransaction = async (tx: ContractTransactionResponse) => {
    let receipt;
    try {
      receipt = await tx.wait();
    } catch (cause) {
      if (isError(cause, "TRANSACTION_REPLACED") && !cause.cancelled) {
        receipt = cause.receipt;
      } else {
        throw cause;
      }
    }
    if (!receipt || receipt.status !== 1) throw new Error("Transaction failed.");
  };
  const submitVaultTransaction = async (
    action: "stake" | "withdraw" | "claim",
    poolId: number,
    amount = ""
  ): Promise<boolean> => {
    if (transactionInProgress.current || mintInProgress.current) return false;
    transactionInProgress.current = true;
    setIsTransacting(true);
    setError(null);
    setMintStatus(null);
    setTransactionStatus(null);
    const isCurrentWallet = () => currentContext.current === walletContext;

    try {
      if (validAddress === ZeroAddress || !address) {
        throw new Error("Connect your wallet first.");
      }
      if (!validateChainId()) throw new Error("Switch your wallet to Sepolia first.");
      if (!vaultContract || !multicall2Contract || !mgoContract || !stkContract) {
        throw new Error("Your wallet is still connecting. Please try again.");
      }
      if (!pools.some((pool) => pool.poolId === poolId)) {
        throw new Error("Wait for live pool data before submitting.");
      }
      const signer = vaultContract.runner as JsonRpcSigner;
      // Recheck the actual wallet before every write, including after approval.
      const assertWallet = async () => {
        const [accounts, network] = await Promise.all([
          signer.provider.send("eth_accounts", []),
          signer.provider.send("eth_chainId", []),
        ]);
        if (!isCurrentWallet() || Number(network) !== 11155111 ||
            accounts[0]?.toLowerCase() !== validAddress.toLowerCase() ||
            (await signer.getAddress()).toLowerCase() !== validAddress.toLowerCase()) {
          throw new Error("Wallet or network changed. Please try again.");
        }
      };
      await assertWallet();
      let value = 0n;
      let isEthPool = false;
      if (action === "claim") {
        // These reads already return integer token units; no parseUnits needed.
        const [pending, rewardBalance] = await Promise.all([
          vaultContract.pendingReward(poolId, validAddress),
          mgoContract.balanceOf(vault.address),
        ]);
        if (pending <= 0n) throw new Error("You have no MGO rewards to claim.");
        if (pending > rewardBalance) {
          throw new Error("The vault needs more MGO to pay this claim.");
        }
      } else {
        const pool = await vaultContract.poolInfo(poolId);
        isEthPool = pool.isEthPool;
        const token = new Contract(pool.stakingToken, stk.abi, signer);
        const decimals = pool.isEthPool ? 18 : Number(await token.decimals());
        const input = amount.trim();
        if (!/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(input)) {
          throw new Error("Enter a valid positive amount.");
        }
        try {
          value = parseUnits(input, decimals);
        } catch {
          throw new Error(`Enter an amount with at most ${decimals} decimal places.`);
        }
        if (value <= 0n) throw new Error("Amount must be greater than zero.");

        if (action === "stake") {
          const balance = pool.isEthPool
            ? await signer.provider.getBalance(validAddress)
            : await token.balanceOf(validAddress);
          if (value > balance) throw new Error("Amount exceeds your wallet balance.");
          if (pool.isEthPool && value === balance) {
            throw new Error("Leave some Sepolia ETH in your wallet for gas.");
          }
          if (!pool.isEthPool) {
            const allowance = await token.allowance(validAddress, vault.address);
            if (allowance < value) {
              await assertWallet();
              setTransactionStatus("Confirm token approval in your wallet.");
              const approval = await token.approve(vault.address, value);
              if (isCurrentWallet()) setTransactionStatus("Approval submitted. Waiting for confirmation…");
              await waitForTransaction(approval);
            }
          }
        } else {
          const position = await vaultContract.userInfo(poolId, validAddress);
          if (value > position.amount) throw new Error("Amount exceeds your staked balance.");
        }
      }

      await assertWallet();
      const actionLabel = action === "claim" ? "claiming MGO" : action === "stake" ? "staking" : "withdrawal";
      setTransactionStatus(`Confirm ${actionLabel} in your wallet.`);
      // Native ETH is attached as value; ERC-20 tokens are pulled using allowance.
      const tx = action === "claim"
        ? await vaultContract.claimReward(poolId)
        : action === "withdraw"
          ? await vaultContract.withdraw(poolId, value)
          : isEthPool
            ? await vaultContract.stake(poolId, value, { value })
            : await vaultContract.stake(poolId, value);
      if (isCurrentWallet()) setTransactionStatus("Transaction submitted. Waiting for confirmation…");
      await waitForTransaction(tx);
      if (!isCurrentWallet()) return false;
      setTransactionStatus(action === "claim" ? "MGO rewards claimed successfully." : action === "stake" ? "Stake confirmed." : "Withdrawal confirmed.");
      try {
        await getStakingPools(multicall2Contract, vaultContract, mgoContract, stkContract, vault);
      } catch {
        if (isCurrentWallet()) setError("Transaction succeeded, but balances could not refresh. Reload to see your updated position.");
      }
      return isCurrentWallet();
    } catch (cause) {
      if (!isCurrentWallet()) return false;
      setTransactionStatus(null);
      if (isError(cause, "ACTION_REJECTED")) {
        setError("Transaction cancelled: you rejected the wallet request.");
      } else if (isError(cause, "INSUFFICIENT_FUNDS")) {
        setError("You need enough Sepolia ETH for the transaction and gas fee.");
      } else if (isError(cause, "TRANSACTION_REPLACED") && cause.cancelled) {
        setError("Transaction cancelled or replaced by a different transaction.");
      } else if (isError(cause, "CALL_EXCEPTION")) {
        setError(cause.reason || "The contract rejected the transaction.");
      } else {
        setError(cause instanceof Error ? cause.message : "Transaction failed. Please try again.");
      }
      return false;
    } finally {
      transactionInProgress.current = false;
      setIsTransacting(false);
    }
  };

  const stakeTokens = (poolId: number, amount: string, _isEth: boolean) =>
    submitVaultTransaction("stake", poolId, amount);

  const withdrawTokens = (poolId: number, amount: string) =>
    submitVaultTransaction("withdraw", poolId, amount);

  const claimRewards = (poolId: number) =>
    submitVaultTransaction("claim", poolId);

  const mintTestTokens = async () => {
    if (mintInProgress.current || transactionInProgress.current) return;
    setError(null);
    setMintStatus(null);

    if (validAddress === ZeroAddress || !address) {
      setError("Connect your wallet before minting STK.");
      return;
    }
    if (!validateChainId()) {
      setError("Switch your wallet to Sepolia before minting STK.");
      return;
    }
    if (!stkContract || !vaultContract || !mgoContract || !multicall2Contract) {
      setError("Your wallet is still connecting. Please try again.");
      return;
    }

    mintInProgress.current = true;
    setIsMinting(true);
    const isCurrentWallet = () => currentContext.current === walletContext;
    try {
      const decimals = await stkContract.decimals();
      if (!isCurrentWallet()) return;
      const amount = parseUnits("1000", decimals);
      setMintStatus("Confirm minting 1,000 STK in your wallet.");
      const tx = await stkContract.faucet(amount);
      if (isCurrentWallet()) setMintStatus("Mint submitted. Waiting for confirmation…");
      // A wallet can speed up a transaction by replacing it with the same call.
      let receipt;
      try {
        receipt = await tx.wait();
      } catch (cause) {
        if (isError(cause, "TRANSACTION_REPLACED") && !cause.cancelled) {
          receipt = cause.receipt;
        } else {
          throw cause;
        }
      }
      if (!receipt || receipt.status !== 1) throw new Error("Mint transaction failed.");
      if (!isCurrentWallet()) return;
      setMintStatus("Successfully minted 1,000 STK to your wallet.");
      try {
        await getStakingPools(multicall2Contract, vaultContract, mgoContract, stkContract, vault);
      } catch {
        if (isCurrentWallet()) {
          setError("Mint succeeded, but the balance could not refresh. Reload to see your STK.");
        }
      }
    } catch (cause) {
      if (!isCurrentWallet()) return;
      setMintStatus(null);
      if (isError(cause, "ACTION_REJECTED")) {
        setError("Mint cancelled: you rejected the wallet request.");
      } else if (isError(cause, "INSUFFICIENT_FUNDS")) {
        setError("You need Sepolia ETH to pay the mint transaction's gas fee.");
      } else if (isError(cause, "TRANSACTION_REPLACED") && cause.cancelled) {
        setError("The mint transaction was cancelled or replaced by a different transaction.");
      } else {
        setError(cause instanceof Error ? cause.message : "Unable to mint STK. Please try again.");
      }
    } finally {
      mintInProgress.current = false;
      setIsMinting(false);
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
    isMinting,
    mintStatus,
    isTransacting,
    transactionStatus,
  };
};
