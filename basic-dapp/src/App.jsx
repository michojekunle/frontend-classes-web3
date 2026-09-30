import { useEffect } from "react";
import ConnectButton from "./components/ConnectButton";
import { useWalletConnection } from "./hooks/useWalletConnection";
import Balance from "./components/Balance";
import WrongNetwork from "./components/WrongNetwork";
import ERC20 from "./components/ERC20";
import TokenAndBalances from "./components/TokenAndBalances";

function App() {
  const {
    account,
    chainId,
    balance,
    isSupportedChain,
    isRefreshingBalance,
    getBalance,
    supportedChains,
    switchChain,
  } = useWalletConnection();

  return (
    <div>
      <h3 style={{ margin: "20px" }}>EIP 1193</h3>
      {account && (
        <>
          <p>Account: {account}</p>
        </>
      )}
      {chainId && (
        <>
          <p>Chainid: {chainId}</p>
        </>
      )}

      {account && (
        <>
          {!isSupportedChain ? (
            <WrongNetwork
              currentChainId={chainId}
              supportedChains={supportedChains}
              switchChain={switchChain}
            />
          ) : (
            <Balance
              balance={balance}
              getBalance={getBalance}
              isRefreshingBalance={isRefreshingBalance}
            />
          )}
        </>
      )}
      <ConnectButton />

      {/* <div style={{ marginTop: "20px" }}>
        <h1>ERC20 READ WRITE</h1>
        <ERC20 />
      </div> */}

      <div style={{ marginTop: "20px" }}>
        <h3>TOKENS AND BALANCES MULTICALL2</h3>
        <TokenAndBalances/>
      </div>
    </div>
  );
}

export default App;
