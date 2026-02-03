// journal.js
// Purpose: small UX helpers only (NO AI, NO logic)

document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("journalInput");

    if (!textarea) return;

    // Auto-resize textarea
    textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    });

    // Soft warning before leaving page with content
    window.addEventListener("beforeunload", (e) => {
        if (textarea.value.trim().length > 0) {
            e.preventDefault();
            e.returnValue = "";
        }
    });
});