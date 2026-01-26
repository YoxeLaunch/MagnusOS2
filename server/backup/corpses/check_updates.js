
// Using native fetch in Node 20
const check = async () => {
    try {
        console.log("Fetching http://localhost:3001/api/updates");
        const res = await fetch('http://localhost:3001/api/updates');
        if (!res.ok) {
            console.error(res.status, res.statusText);
            console.error(await res.text());
            return;
        }
        const data = await res.json();
        console.log("Updates found:", data.length);
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
check();
