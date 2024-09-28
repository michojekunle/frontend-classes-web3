import { Route, Routes } from "react-router-dom";
import Eip1193WalletConnector from "./pages/eip1193-wallet-connector";
import Eip6963WalletConnectors from "./pages/eip-6963";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Eip1193WalletConnector />} />
      <Route path="/eip-6963" element={<Eip6963WalletConnectors />} />
    </Routes>
  );
};

export default App;
