import { useEffect } from "react";
import ConnectButton from "./components/ConnectButton";
import { useWalletConnection } from "./hooks/useWalletConnection";
import Balance from "./components/Balance";
import WrongNetwork from "./components/WrongNetwork";

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
      <h1 style={{ margin: "20px" }}>EIP 1193</h1>
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
    </div>
  );
}

export default App;
