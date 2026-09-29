const http = require("http");

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on("error", reject);
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

async function runTest() {
    console.log("Checking if Express server is running on port 5000...");
    try {
        const res = await makeRequest({
            hostname: "127.0.0.1",
            port: 5000,
            path: "/",
            method: "GET"
        });
        console.log("✔ Backend Server Response:", res.status, res.data);
    } catch (e) {
        console.error("❌ Backend Server is NOT running on port 5000:", e.message);
    }
}

runTest();
