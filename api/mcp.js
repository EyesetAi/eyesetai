export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'Eyeset MCP Server',
      version: '1.0.0',
      protocolVersion: '2025-06-18',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { method, id, params } = req.body || {};

  if (method === 'initialize') {
    return res.status(200).json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: { name: 'Eyeset', version: '1.0.0' },
        capabilities: { tools: {} },
      },
    });
  }

  if (method === 'tools/list') {
    return res.status(200).json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'get_agent_info',
            description: 'Get information about the Eyeset agent on Abstract blockchain',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'get_onchain_status',
            description: 'Get current on-chain status of Eyeset agent (token #689)',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'rugpull_bakery_bake',
            description: 'Execute a bake on RugPull Bakery (rugpullbakery.com) at optimal multiplier timing on Abstract Mainnet',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'rugpull_bakery_status',
            description: 'Get current leaderboard position, prize pool, and multiplier status on RugPull Bakery',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      },
    });
  }

  if (method === 'tools/call') {
    return res.status(200).json({
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: 'Eyeset agent is active on Abstract Mainnet (Chain ID 2741), Token #689, ERC-8004.' }],
      },
    });
  }

  return res.status(200).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' },
  });
}
