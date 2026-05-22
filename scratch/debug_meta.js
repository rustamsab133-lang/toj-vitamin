const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.vercel
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env.vercel')));

const pageToken = envConfig.INSTAGRAM_PAGE_TOKEN;

if (!pageToken) {
  console.error("❌ No INSTAGRAM_PAGE_TOKEN found in .env.vercel!");
  process.exit(1);
}

console.log("Token starts with:", pageToken.substring(0, 15) + "...");

async function run() {
  try {
    // 1. Get Token Debug Info / Page details
    console.log("\n--- Checking Token & Page Info ---");
    let response = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${pageToken}`);
    let data = await response.json();
    if (data.error) {
      console.error("❌ Error fetching page info:", data.error);
      return;
    }
    console.log("Page ID:", data.id);
    console.log("Page Name:", data.name);
    
    // 2. Get Handover Protocol info for Page
    console.log("\n--- Checking Handover Protocol / Receiver Apps for Page ---");
    const pageId = data.id;
    response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/primary_receiver_app?access_token=${pageToken}`);
    let primaryData = await response.json();
    console.log("Primary Receiver App:", JSON.stringify(primaryData, null, 2));

    response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/secondary_receiver_apps?access_token=${pageToken}`);
    let secondaryData = await response.json();
    console.log("Secondary Receiver Apps:", JSON.stringify(secondaryData, null, 2));

    // 2.5 Check Token Permissions using debug_token
    console.log("\n--- Checking Page Access Token Scopes via debug_token ---");
    response = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${pageToken}&access_token=${pageToken}`);
    let permissionData = await response.json();
    console.log("Token Scopes / Details:", JSON.stringify(permissionData, null, 2));

    // 3. Get Instagram Business Account
    console.log("\n--- Checking Instagram Business Account linked to this page ---");
    response = await fetch(`https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${pageToken}`);
    let igData = await response.json();
    if (igData.error) {
      console.error("❌ Error fetching linked Instagram account:", igData.error);
    } else {
      console.log("Instagram Business Account linked:", igData.instagram_business_account);
    }
    
    // 4. Check App Subscriptions on Page
    console.log("\n--- Checking Webhook Subscriptions for this Page ---");
    response = await fetch(`https://graph.facebook.com/v19.0/me/subscribed_apps?access_token=${pageToken}`);
    let subData = await response.json();
    if (subData.error) {
      console.error("❌ Error fetching subscribed apps:", subData.error);
    } else {
      console.log("Subscribed Apps:", JSON.stringify(subData.data, null, 2));
    }
    
    // 5. Try subscribing/resubscribing page to the app's webhooks with required fields
    console.log("\n--- Attempting to SUBSCRIBE/RESUBSCRIBE Page to Webhooks ---");
    const subscribeUrl = `https://graph.facebook.com/v19.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads&access_token=${pageToken}`;
    response = await fetch(subscribeUrl, {
      method: 'POST'
    });
    let subResult = await response.json();
    if (subResult.error) {
      console.error("❌ Error subscribing app to page events:", subResult.error);
    } else {
      console.log("✅ Subscription Result:", subResult);
    }
    
    // Check subscriptions again
    response = await fetch(`https://graph.facebook.com/v19.0/me/subscribed_apps?access_token=${pageToken}`);
    subData = await response.json();
    console.log("Updated Subscribed Apps:", JSON.stringify(subData.data, null, 2));

  } catch (err) {
    console.error("❌ Script error:", err);
  }
}

run();
