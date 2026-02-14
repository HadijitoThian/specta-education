// Quick test to verify Xendit invoice creation works end-to-end
// Run: node server/testXenditInvoice.mjs

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
if (!XENDIT_SECRET_KEY) {
  console.error("XENDIT_SECRET_KEY not set");
  process.exit(1);
}

const testOrderId = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function testCreateInvoice() {
  console.log("Testing Xendit Invoice Creation...");
  console.log("Order ID:", testOrderId);
  
  const body = {
    external_id: testOrderId,
    amount: 79000,
    currency: "IDR",
    description: "TEST - Tes Bakat AI Pro",
    customer: {
      given_names: "Test User",
      email: "test@example.com",
    },
    invoice_duration: 300, // 5 minutes for test
  };

  try {
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(XENDIT_SECRET_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("\n✅ Xendit Invoice Created Successfully!");
      console.log("Invoice ID:", data.id);
      console.log("Invoice URL:", data.invoice_url);
      console.log("Status:", data.status);
      console.log("Amount:", data.amount);
      console.log("Expiry:", data.expiry_date);
    } else {
      console.error("\n❌ Xendit Invoice Creation Failed!");
      console.error("Status:", response.status);
      console.error("Error:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("\n❌ Network Error:", err.message);
  }
}

testCreateInvoice();
