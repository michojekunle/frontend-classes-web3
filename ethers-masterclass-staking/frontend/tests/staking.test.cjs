const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const ethers = require('ethers');

// Exercise the real hook's handlers without a browser or live wallet.
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/hooks/useWeb3Staking.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText;
const address = '0x1111111111111111111111111111111111111111';
function setup(options = {}) {
  const calls = [];
  const states = [];
  const receipt = { status: options.receiptStatus ?? 1 };
  const tx = (name) => ({ wait: async () => {
    calls.push(`${name}:confirmed`);
    if (options.failWait === name) throw options.failure;
    return receipt;
  } });
  const signer = {
    getAddress: async () => address,
    provider: {
      send: async (method) => method === 'eth_accounts' ? [address]
        : (options.switchAfterApproval && calls.includes('approve:confirmed')) || (options.switchBeforeClaim && calls.includes('pendingReward')) ? '0x1' : '0xaa36a7',
      getBalance: async () => ethers.parseEther('10'),
    },
  };
  const token = {
    decimals: async () => options.eth ? 18 : 6,
    balanceOf: async () => 100_000_000n,
    allowance: async () => options.allowance ?? 0n,
    approve: async (spender, value) => {
      calls.push(['approve', spender, value]);
      if (options.rejectApproval) throw Object.assign(new Error('Rejected'), { code: 'ACTION_REJECTED' });
      return tx('approve');
    },
  };
  const vault = {
    runner: signer,
    poolInfo: async () => ({ isEthPool: !!options.eth, stakingToken: 'token' }),
    userInfo: async () => ({ amount: 50_000_000n }),
    stake: async (...args) => { calls.push(['stake', ...args]); return tx('stake'); },
    withdraw: async (...args) => { calls.push(['withdraw', ...args]); return tx('withdraw'); },
    pendingReward: async (poolId, user) => {
      assert.equal(poolId, 0);
      assert.equal(user, address);
      calls.push('pendingReward');
      return options.pending ?? 10_000_000n;
    },
    claimReward: async (...args) => {
      calls.push(['claim', ...args]);
      if (options.rejectClaim) throw Object.assign(new Error('Rejected'), { code: 'ACTION_REJECTED' });
      return tx('claim');
    },
    poolLength: async () => {
      calls.push('refresh');
      if (options.failRefresh) throw new Error('RPC unavailable');
      return 0n;
    },
  };
  const config = {
    vault: { address: 'vault', abi: [] }, stk: { address: 'stk', abi: [] },
    mgo: { address: 'mgo', abi: [] }, multicall2: { address: 'multicall', abi: [] },
  };
  const contracts = { vault, stk: token, mgo: {
    decimals: token.decimals,
    balanceOf: async (owner) => {
      assert.equal(owner, 'vault');
      calls.push('rewardBalance');
      return options.rewardBalance ?? 100_000_000n;
    },
  }, multicall: {} };
  const exports = {};
  vm.runInNewContext(source, {
    exports, console: { log() {} },
    require(name) {
      if (name === 'react') return {
        useState(initial) {
          const index = states.length;
          states.push(Array.isArray(initial) ? [{ poolId: 0 }] : initial);
          return [states[index], (value) => { states[index] = value; }];
        },
        useEffect() {}, useMemo: (fn) => fn(), useCallback: (fn) => fn,
        useRef: (current) => ({ current }),
      };
      if (name === 'ethers') return { ...ethers, Contract: function () { return token; } };
      if (name.endsWith('stakingConfig')) return { CONTRACTS: config };
      if (name.endsWith('useContract')) return { useContract: () => ({ getContract: (id) => contracts[id] }) };
      if (name.endsWith('useWalletConnection')) return { useWalletConnection: () => ({
        wallet: { address, chainId: 11155111 },
        validateChainId: () => !options.wrongChain, isSupportedChain: true,
      }) };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { hook: exports.useStakingVault(address), calls, states };
}

test('ERC20 approval confirms before staking, using staking token decimals', async () => {
  const { hook, calls } = setup();
  assert.equal(await hook.stakeTokens(0, '1.25', false), true);
  assert.deepEqual(calls, [
    ['approve', 'vault', 1_250_000n], 'approve:confirmed',
    ['stake', 0, 1_250_000n], 'stake:confirmed', 'refresh',
  ]);
});
test('sufficient allowance skips approval', async () => {
  const { hook, calls } = setup({ allowance: 100_000_000n });
  assert.equal(await hook.stakeTokens(0, '1', false), true);
  assert.equal(calls[0][0], 'stake');
});
test('ETH staking attaches value without approval', async () => {
  const { hook, calls } = setup({ eth: true });
  assert.equal(await hook.stakeTokens(0, '0.5', true), true);
  assert.equal(calls[0][0], 'stake');
  assert.equal(calls[0][2], ethers.parseEther('0.5'));
  assert.equal(calls[0][3].value, ethers.parseEther('0.5'));
});
test('partial and full withdrawals need no approval', async () => {
  for (const amount of ['10', '50']) {
    const { hook, calls } = setup();
    assert.equal(await hook.withdrawTokens(0, amount), true);
    assert.deepEqual(calls, [
      ['withdraw', 0, ethers.parseUnits(amount, 6)], 'withdraw:confirmed', 'refresh',
    ]);
  }
});
test('invalid amounts and excessive balances never submit transactions', async () => {
  for (const amount of ['0', '-1', '1e3', 'abc', '0.0000001', '101']) {
    const { hook, calls } = setup();
    assert.equal(await hook.stakeTokens(0, amount, false), false, amount);
    assert.deepEqual(calls, []);
  }
  const { hook, calls } = setup();
  assert.equal(await hook.withdrawTokens(0, '51'), false);
  assert.deepEqual(calls, []);
});
test('rejected approval does not proceed to stake', async () => {
  const { hook, calls } = setup({ rejectApproval: true });
  assert.equal(await hook.stakeTokens(0, '1', false), false);
  assert.equal(calls.length, 1);
});
test('network changes after approval stop staking', async () => {
  const { hook, calls } = setup({ switchAfterApproval: true });
  assert.equal(await hook.stakeTokens(0, '1', false), false);
  assert.equal(calls.some((call) => Array.isArray(call) && call[0] === 'stake'), false);
});
test('unsupported network and unavailable pool are blocked', async () => {
  for (const [options, poolId] of [[{ wrongChain: true }, 0], [{}, 9]]) {
    const { hook, calls } = setup(options);
    assert.equal(await hook.stakeTokens(poolId, '1', false), false);
    assert.deepEqual(calls, []);
  }
});
test('concurrent submission is blocked', async () => {
  const { hook } = setup();
  const first = hook.stakeTokens(0, '1', false);
  assert.equal(await hook.withdrawTokens(0, '1'), false);
  assert.equal(await first, true);
});
test('refresh failure preserves confirmed transaction success', async () => {
  const { hook, states } = setup({ failRefresh: true });
  assert.equal(await hook.withdrawTokens(0, '1'), true);
  assert.ok(states.some((value) => typeof value === 'string' && value.includes('balances could not refresh')));
});
test('sped-up transactions succeed but cancelled replacements fail', async () => {
  for (const cancelled of [false, true]) {
    const failure = Object.assign(new Error('Replaced'), {
      code: 'TRANSACTION_REPLACED', cancelled, receipt: { status: 1 },
    });
    const { hook } = setup({ failWait: 'withdraw', failure });
    assert.equal(await hook.withdrawTokens(0, '1'), !cancelled);
  }
});


test('claim checks rewards and funding, sends only pool ID, confirms and refreshes', async () => {
  const { hook, calls, states } = setup();
  assert.equal(await hook.claimRewards(0), true);
  assert.deepEqual(calls, ['pendingReward', 'rewardBalance', ['claim', 0], 'claim:confirmed', 'refresh']);
  assert.ok(states.includes('MGO rewards claimed successfully.'));
});
test('zero rewards and insufficient funding prevent claims with helpful errors', async () => {
  for (const [options, message] of [
    [{ pending: 0n }, 'You have no MGO rewards to claim.'],
    [{ rewardBalance: 1n }, 'The vault needs more MGO to pay this claim.'],
  ]) {
    const { hook, calls, states } = setup(options);
    assert.equal(await hook.claimRewards(0), false);
    assert.deepEqual(calls, ['pendingReward', 'rewardBalance']);
    assert.ok(states.includes(message));
    // Failure releases the shared transaction lock.
    assert.equal(await hook.withdrawTokens(0, '1'), true);
  }
});
test('claim rejects unsupported network, unloaded pool and network change before write', async () => {
  for (const [options, poolId] of [[{ wrongChain: true }, 0], [{}, 9], [{ switchBeforeClaim: true }, 0]]) {
    const { hook, calls } = setup(options);
    assert.equal(await hook.claimRewards(poolId), false);
    assert.equal(calls.some((call) => Array.isArray(call) && call[0] === 'claim'), false);
  }
});
test('pending claim blocks duplicate claims, staking, withdrawal and minting', async () => {
  const { hook, calls } = setup();
  const first = hook.claimRewards(0);
  assert.equal(await hook.claimRewards(0), false);
  assert.equal(await hook.stakeTokens(0, '1', false), false);
  assert.equal(await hook.withdrawTokens(0, '1'), false);
  await hook.mintTestTokens();
  assert.equal(await first, true);
  assert.equal(calls.filter((call) => Array.isArray(call)).length, 1);
});
test('claim rejection and failed receipt preserve failure and release lock', async () => {
  for (const options of [{ rejectClaim: true }, { receiptStatus: 0 }]) {
    const { hook, calls, states } = setup(options);
    assert.equal(await hook.claimRewards(0), false);
    assert.equal(calls.includes('refresh'), false);
    assert.equal(states.includes('MGO rewards claimed successfully.'), false);
    const before = calls.length;
    await hook.claimRewards(0);
    assert.ok(calls.length > before);
  }
});
test('claim handles repricing, cancelled replacement and refresh failure', async () => {
  for (const cancelled of [false, true]) {
    const failure = Object.assign(new Error('Replaced'), {
      code: 'TRANSACTION_REPLACED', cancelled, receipt: { status: 1 },
    });
    const { hook } = setup({ failWait: 'claim', failure });
    assert.equal(await hook.claimRewards(0), !cancelled);
  }
  const { hook, states } = setup({ failRefresh: true });
  assert.equal(await hook.claimRewards(0), true);
  assert.ok(states.includes('MGO rewards claimed successfully.'));
  assert.ok(states.some((value) => typeof value === 'string' && value.includes('balances could not refresh')));
});
