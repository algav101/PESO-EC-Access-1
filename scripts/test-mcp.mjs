
async function testMcpEndpoint() {
  const url = "https://mcp.supabase.com/mcp?project_ref=dcqnskpcuckmgrnietyg";
  const secretKey = "sb_secret_DkwyuURbZ9M3okqntjShkg_ej_W_iHJ";
  const publishableKey = "sb_publishable_F6FcMIxwc6wjcOz4MBFIzg_J5e9JAKf";

  console.log("Testing without header:");
  try {
    const r1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1, params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } } })
    });
    console.log("Status:", r1.status, await r1.text());
  } catch (e) {
    console.log("Err:", e.message);
  }

  console.log("\nTesting with Bearer secretKey header:");
  try {
    const r2 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1, params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } } })
    });
    console.log("Status:", r2.status, await r2.text());
  } catch (e) {
    console.log("Err:", e.message);
  }

  console.log("\nTesting with apikey header:");
  try {
    const r3 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": secretKey,
        "Authorization": `Bearer ${secretKey}`
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1, params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } } })
    });
    console.log("Status:", r3.status, await r3.text());
  } catch (e) {
    console.log("Err:", e.message);
  }
}

testMcpEndpoint();
