import { useWalletConnection } from "../hooks/useWalletConnection";

const ConnectButton = () => {
  const { account, connectWallet, disconnectWallet } = useWalletConnection();
  return (
    <button onClick={account ? disconnectWallet : connectWallet}>
      {account ? "Disconnect Wallet" : "Connect Wallet"}
    </button>
  );
};

export default ConnectButton;
