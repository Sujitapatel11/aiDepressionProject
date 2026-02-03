const list = document.getElementById("list");

if (localStorage.getItem("peerOptIn") !== "true") {
    list.innerHTML = "<p>You have not enabled peer suggestions.</p>";
} else {
    const mockPeers = [
        "QuietRiver42",
        "BlueSky19",
        "StillMind88"
    ];

    mockPeers.forEach(name => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="alias">${name}</div>
            <p>May relate to similar challenges.</p>
            <button onclick="connect('${name}')">Send Connection Request</button>
        `;
        list.appendChild(card);
    });
}

function connect(name) {
    localStorage.setItem("chatMode", "HUMAN");
    localStorage.setItem("chatUser", name);
    alert("Connection request sent. Chat unlocked for demo.");
    window.location.href = "/chat/";
}
