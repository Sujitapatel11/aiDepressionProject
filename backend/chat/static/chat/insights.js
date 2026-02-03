// Mock insights for demo purposes
// In real system, these would come from aggregated, anonymized analysis

const themes = [
    "Academic pressure",
    "Sleep concerns",
    "Feeling overwhelmed",
    "Desire for connection"
];

const themesDiv = document.getElementById("themes");

themes.forEach(t => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.innerText = t;
    themesDiv.appendChild(badge);
});

document.getElementById("styleText").innerText =
    "Your recent entries show thoughtful reflection and consistent engagement. You tend to express experiences in detail rather than short emotional reactions.";

document.getElementById("reflectionText").innerText =
    "You may benefit from continuing journaling and connecting with supportive peers. Small, regular reflection appears to be helpful for you.";
