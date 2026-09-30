const Balance = ({ balance, getBalance, isRefreshingBalance }) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-sm text-gray-500">Balance </p>
          <p className="mt-1 text-2xl font-semibold">
            {balance !== null ? `${Number(balance).toFixed(5)} ETH` : "--"}
          </p>
        </div>
        <button
          onClick={getBalance}
          disabled={isRefreshingBalance}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshingBalance ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
};

export default Balance;
