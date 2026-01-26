
import fetch from 'node-fetch';

async function checkUpdates() {
    try {
        console.log("Fetching from http://localhost:3001/api/updates...");
        const res = await fetch('http://localhost:3001/api/updates');
        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            console.error(await res.text());
            return;
        }
        const data = await res.json();
        console.log("Updates found:", data.length);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

checkUpdates();
