function saveEntry() {
    const text = document.getElementById("journalText").value.trim();
    if (!text) return;

    const entries = document.getElementById("entries");

    const entry = document.createElement("div");
    entry.className = "entry";

    const date = new Date().toLocaleString();

    entry.innerHTML = `
        <small>${date}</small>
        <p>${text}</p>
    `;

    entries.prepend(entry);
    document.getElementById("journalText").value = "";
}