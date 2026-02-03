const list = document.getElementById("friendList");

function addFriend() {
    const input = document.getElementById("friendInput");
    const name = input.value.trim();
    if (!name) return;

    const item = document.createElement("div");
    item.className = "friend";

    item.innerHTML = `
        <span>${name}</span>
        <button onclick="openChat('${name}')">Chat</button>
    `;

    list.appendChild(item);
    input.value = "";
}

function openChat(name) {
    // For demo: redirect to chat and explain mode
    localStorage.setItem("chatMode", "HUMAN");
    localStorage.setItem("chatUser", name);
    window.location.href = "/chat/";
}