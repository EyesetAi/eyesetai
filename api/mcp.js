const { ethers } = require('ethers');

const RPC = 'https://api.mainnet.abs.xyz';
const TRPC_BASE = 'https://www.rugpullbakery.com/api/trpc';
const BOOST_MANAGER = '0xa8a91aC36dD6a1055D36bA18aE91348f3AA3d7F9';
const AGENT_CONTRACT = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const AGENT_WALLET = '0x7f0EDE9D6C84Fec8f19bEC8bc3571A6b5bBc3aDc';

async function getBakeryStatus() {
  try {
    const input = encodeURIComponent(JSON.stringify({ json: {} }));
    const res = await fetch(`${TRPC_BASE}/leaderboard.getTopBakeries?input=${input}`);
    const data = await res.json();
    const items = data?.result?.data?.json?.items || [];
    const idx = items.findIndex(i => i.walletAddress?.toLowerCase() === AGENT_WALLET.toLowerCase());
    const eyeset = items[idx];
    const top5 = items.slice(0, 5).map((i, n) => `#${n+1} ${i.name || i.walletAddress?.slice(0,8)} — ${i.cookieCount ?? '?'} cookies`).join('\n');
    return {
      eyeset_rank: idx >= 0 ? `#${idx+1}` : 'Not in top list',
      eyeset_cookies: eyeset?.cookieCount ?? 'N/A',
      top5_leaderboard: top5,
    };
  } catch (e) { return { error: e.message }; }
}

async function getMultiplier() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const boostAbi = [
      'function getActiveBoosts(uint256 clanId) view returns (tuple(uint256,uint256,uint256,uint256,uint16)[])',
      'function getActiveDebuffs(uint256 clanId) view returns (tuple(uint256,uint256,uint256,uint256,uint16)[])',
    ];
    const input = encodeURIComponent(JSON.stringify({ json: { walletAddress: AGENT_WALLET } }));
    const res = await fetch(`${TRPC_BASE}/player.getPlayer?input=${input}`);
    const pdata = await res.json();
    const clanId = pdata?.result?.data?.json?.clanId ?? 1;
    const bm = new ethers.Contract(BOOST_MANAGER, boostAbi, provider);
    const [boosts, debuffs] = await Promise.all([
      bm.getActiveBoosts(BigInt(clanId)),
      bm.getActiveDebuffs(BigInt(clanId)),
    ]);
    let netBps = 10000;
    for (const b of boosts) netBps += Number(b[4]);
    for (const d of debuffs) netBps -= Number(d[4]);
    const mult = (netBps / 10000).toFixed(2);
    return { multiplier: `${mult}x (${Math.round(netBps/100)}%)`, clan_id: clanId, active_boosts: boosts.length, active_debuffs: debuffs.length };
  } catch (e) { return { error: e.message }; }
}

async function getOnchainStatus() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const c = new ethers.Contract(AGENT_CONTRACT, ['function tokenURI(uint256) view returns (string)'], provider);
    const uri = await c.tokenURI(689);
    const json = JSON.parse(Buffer.from(uri.replace('data:application/json;base64,', ''), 'base64').toString());
    return {
      name: json.name,
      token_id: 689,
      chain: 'Abstract Mainnet (2741)',
      services: json.services?.map(s => s.name).join(', '),
      wallet: AGENT_WALLET,
    };
  } catch (e) { return { error: e.message }; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ name: 'Eyeset MCP Server', version: '1.0.0', protocolVersion: '2025-06-18' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { method, id, params } = req.body || {};

  if (method === 'initialize') {
    return res.status(200).json({
      jsonrpc: '2.0', id,
      result: { protocolVersion: '2025-06-18', serverInfo: { name: 'Eyeset', version: '1.0.0' }, capabilities: { tools: {} } },
    });
  }

  if (method === 'tools/list') {
    return res.status(200).json({
      jsonrpc: '2.0', id,
      result: { tools: [
        { name: 'get_agent_info', description: 'Get Eyeset agent info (ERC-8004 token #689 on Abstract Mainnet)', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_onchain_status', description: 'Get live on-chain status of Eyeset agent from blockchain', inputSchema: { type: 'object', properties: {} } },
        { name: 'rugpull_bakery_status', description: 'Get leaderboard position and cookies count on RugPull Bakery', inputSchema: { type: 'object', properties: {} } },
        { name: 'rugpull_bakery_multiplier', description: 'Get current net baking multiplier with active boosts/debuffs', inputSchema: { type: 'object', properties: {} } },
      ]},
    });
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    let result;
    if (toolName === 'get_agent_info') {
      result = { name: 'Eyeset', token_id: 689, standard: 'ERC-8004', chain: 'Abstract Mainnet (2741)', wallet: AGENT_WALLET, website: 'https://eyesetai.vercel.app', twitter: 'https://x.com/Eyesblinks' };
    } else if (toolName === 'get_onchain_status') {
      result = await getOnchainStatus();
    } else if (toolName === 'rugpull_bakery_status') {
      result = await getBakeryStatus();
    } else if (toolName === 'rugpull_bakery_multiplier') {
      result = await getMultiplier();
    } else {
      return res.status(200).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found' } });
    }
    return res.status(200).json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
  }

  return res.status(200).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
};
