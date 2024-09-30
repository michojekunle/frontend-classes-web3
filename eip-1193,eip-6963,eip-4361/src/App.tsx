import { Route, Routes } from "react-router-dom";
import Eip1193WalletConnector from "./pages/eip1193-wallet-connector";
import Eip6963WalletConnectors from "./pages/eip-6963";
import WalletConnectionProvider from "./context";

const App = () => {
  return (
    <WalletConnectionProvider>
      <Routes>
        <Route path="/" element={<Eip1193WalletConnector />} />
        <Route path="/eip-6963" element={<Eip6963WalletConnectors />} />
      </Routes>
    </WalletConnectionProvider>
  );
};

export default App;
