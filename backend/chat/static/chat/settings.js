const toggle = document.getElementById("optInToggle");

toggle.checked = localStorage.getItem("peerOptIn") === "true";

toggle.onchange = () => {
    localStorage.setItem("peerOptIn", toggle.checked);
};
