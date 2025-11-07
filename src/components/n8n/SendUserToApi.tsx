"use client";
import { useEffect } from "react";

export default function SendUserToApi() {
  useEffect(() => {
   
    
    const stored = localStorage.getItem("user_data"); 
  
    if (!stored) {
      console.warn("⚠️ No user_data found in localStorage");
      return;
    }

    const user = JSON.parse(stored);
    console.log("👤 Parsed user data:", user);

    if (user?.user_id) {
      console.log("📤 Sending POST request with user_id:", user.user_id);
      fetch("/api/n8n/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id }),
      })
      .then((response) => {
        console.log("📥 POST response status:", response.status);
        if (response.ok) {
          console.log("✅ Synced user to API:", user.user_id);
          
          // Wait a moment to ensure POST completes on server
          return new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.error("❌ POST request failed:", response.status);
          throw new Error("POST request failed");
        }
      })
      .then(() => {
        // Now make a GET request to retrieve it
        console.log("📤 Making GET request to retrieve user_id");
        return fetch("/api/n8n/user");
      })
      .then((response) => {
        console.log("📥 GET response status:", response.status);
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`GET request failed with status: ${response.status}`);
        }
      })
      .then((data) => {
        console.log("📋 GET response data:", data);
        if (data.success) {
          console.log("✅ Retrieved user_id from API:", data.user_id);
        } else {
          console.error("❌ GET request failed:", data.message);
        }
      })
      .catch((error) => {
        console.error("❌ Error:", error);
      });
    } else {
      console.warn("⚠️ user_data has no user_id");
    }
  }, []);

  return null;
}
