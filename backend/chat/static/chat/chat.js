// ===============================
// CHAT.JS — PRODUCTION VERSION
// ===============================

// Validate required globals
if (!window.ROOM_NAME || !window.CURRENT_USERNAME) {
    console.error("❌ ROOM_NAME or CURRENT_USERNAME missing");
    throw new Error("Chat cannot initialize");
}

// ===============================
// CHAT MANAGER
// ===============================
const ChatManager = (() => {
    // Configuration
    const CONFIG = {
        MAX_MESSAGE_LENGTH: 5000,
        TYPING_RATE_LIMIT: 500, // ms
        TYPING_INDICATOR_TIMEOUT: 1500, // ms
        AUTO_SCROLL_THRESHOLD: 150, // px
        RECONNECT_DELAY: 3000, // ms
        MAX_RECONNECT_DELAY: 30000 // ms
    };

    // State
    const state = {
        isConnected: false,
        lastTypingSent: 0,
        typingTimeout: null,
        reconnectAttempts: 0,
        messageQueue: []
    };

    // DOM References
    let dom = {
        messagesContainer: null,
        messageForm: null,
        messageInput: null,
        typingIndicator: null
    };

    let socket = null;

    /**
     * Initialize the chat application
     */
    function init() {
        cacheDOMElements();
        validateDOM();
        setupSocket();
        setupEventListeners();
        console.log("✅ Chat initialized");
    }

    /**
     * Cache DOM elements
     */
    function cacheDOMElements() {
        dom.messagesContainer = document.getElementById("messagesContainer");
        dom.messageForm = document.getElementById("messageForm");
        dom.messageInput = document.getElementById("messageInput");
        dom.typingIndicator = document.getElementById("typingIndicator");
    }

    /**
     * Validate DOM elements exist
     */
    function validateDOM() {
        const required = ["messagesContainer", "messageForm", "messageInput", "typingIndicator"];
        for (const el of required) {
            if (!dom[el]) {
                throw new Error(`❌ Required element '${el}' not found`);
            }
        }
    }

    /**
     * Setup WebSocket connection
     */
    function setupSocket() {
        try {
            const protocol = location.protocol === "https:" ? "wss" : "ws";
            const wsUrl = `${protocol}://${location.host}/ws/chat/${encodeURIComponent(ROOM_NAME)}/`;
            
            socket = new WebSocket(wsUrl);
            
            socket.onopen = handleSocketOpen;
            socket.onerror = handleSocketError;
            socket.onclose = handleSocketClose;
            socket.onmessage = handleSocketMessage;
        } catch (err) {
            console.error("❌ Failed to setup WebSocket:", err);
            showError("Failed to connect to chat server");
        }
    }

    /**
     * Handle WebSocket open
     */
    function handleSocketOpen() {
        console.log("✅ WebSocket connected");
        state.isConnected = true;
        state.reconnectAttempts = 0;
        dom.messageInput.disabled = false;
        
        // Process queued messages
        while (state.messageQueue.length > 0) {
            const msg = state.messageQueue.shift();
            socket.send(msg);
        }
    }

    /**
     * Handle WebSocket error
     */
    function handleSocketError(err) {
        console.error("❌ WebSocket error:", err);
        showError("Connection error. Attempting to reconnect...");
    }

    /**
     * Handle WebSocket close
     */
    function handleSocketClose() {
        console.warn("⚠️ WebSocket closed");
        state.isConnected = false;
        dom.messageInput.disabled = true;
        
        // Attempt reconnection with exponential backoff
        attemptReconnect();
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    function attemptReconnect() {
        state.reconnectAttempts++;
        const delay = Math.min(
            CONFIG.RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts - 1),
            CONFIG.MAX_RECONNECT_DELAY
        );
        
        console.log(`⏳ Reconnecting in ${delay}ms... (attempt ${state.reconnectAttempts})`);
        setTimeout(() => setupSocket(), delay);
    }

    /**
     * Handle incoming WebSocket message
     */
    function handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            // Validate message type
            if (!data.type) {
                console.warn("⚠️ Message missing 'type' field");
                return;
            }

            if (data.type === "typing") {
                handleTypingIndicator(data);
                return;
            }

            if (data.type === "message") {
                handleChatMessage(data);
                return;
            }

            if (data.type === "error") {
                showError(data.message || "An error occurred");
                return;
            }

            console.warn("⚠️ Unknown message type:", data.type);
        } catch (err) {
            console.error("❌ Failed to parse message:", err);
        }
    }

    /**
     * Handle incoming chat message
     */
    function handleChatMessage(data) {
        // Validate required fields
        if (!data.message || typeof data.message !== "string") {
            console.warn("⚠️ Message missing or invalid");
            return;
        }

        if (!data.sender || typeof data.sender !== "string") {
            console.warn("⚠️ Sender missing or invalid");
            return;
        }

        if (!data.timestamp) {
            console.warn("⚠️ Timestamp missing");
            return;
        }

        // Validate message length
        if (data.message.length > CONFIG.MAX_MESSAGE_LENGTH) {
            console.warn("⚠️ Message exceeds maximum length");
            return;
        }

        // Render the message
        const isMe = data.sender === CURRENT_USERNAME;
        const timestamp = validateTimestamp(data.timestamp);
        renderMessage(data.message, isMe, timestamp, data.sender);
    }

    /**
     * Validate and sanitize timestamp
     */
    function validateTimestamp(ts) {
        try {
            const date = new Date(ts);
            if (isNaN(date.getTime())) {
                return new Date().toLocaleTimeString();
            }
            return typeof ts === "string" ? ts : date.toLocaleTimeString();
        } catch {
            return new Date().toLocaleTimeString();
        }
    }

    /**
     * Render a message in the DOM
     */
    function renderMessage(content, isMe, timestamp, sender) {
        // Remove empty state if present
        const empty = dom.messagesContainer.querySelector(".empty-chat");
        if (empty) empty.remove();

        // Create message group container
        const group = document.createElement("div");
        group.className = `message-group ${isMe ? "me" : "other"}`;
        group.setAttribute("role", "article");
        group.setAttribute("aria-label", `Message from ${isMe ? "you" : sender}`);

        // Create message bubble
        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        // Create content element
        const contentEl = document.createElement("div");
        contentEl.className = "message-content";
        contentEl.textContent = content; // Safe: prevents XSS

        // Create timestamp element
        const timeEl = document.createElement("div");
        timeEl.className = "message-time";
        timeEl.textContent = timestamp;

        // Assemble DOM
        bubble.appendChild(contentEl);
        bubble.appendChild(timeEl);
        group.appendChild(bubble);
        dom.messagesContainer.appendChild(group);

        // Trigger auto-scroll
        autoScroll();

        // Clear typing indicator
        clearTypingIndicator();
    }

    /**
     * Send a message
     */
    function sendMessage(text) {
        // Validate input
        if (!text || text.length === 0) {
            return false;
        }

        if (text.length > CONFIG.MAX_MESSAGE_LENGTH) {
            showError(`Message too long (max ${CONFIG.MAX_MESSAGE_LENGTH} characters)`);
            return false;
        }

        // Prepare message
        const message = JSON.stringify({
            type: "message",
            message: text
        });

        // Send or queue
        if (state.isConnected && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
            return true;
        } else {
            state.messageQueue.push(message);
            showWarning("Message queued. Waiting for connection...");
            return false;
        }
    }

    /**
     * Send typing indicator
     */
    function sendTypingIndicator() {
        const now = Date.now();
        
        // Rate limit typing indicators
        if (now - state.lastTypingSent < CONFIG.TYPING_RATE_LIMIT) {
            return;
        }

        state.lastTypingSent = now;

        if (state.isConnected && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "typing" }));
        }
    }

    /**
     * Handle incoming typing indicator
     */
    function handleTypingIndicator(data) {
        // Ignore own typing indicator
        if (data.sender === CURRENT_USERNAME) {
            return;
        }

        // Show typing indicator
        dom.typingIndicator.classList.add("active");

        // Clear existing timeout
        clearTimeout(state.typingTimeout);

        // Hide after timeout
        state.typingTimeout = setTimeout(() => {
            clearTypingIndicator();
        }, CONFIG.TYPING_INDICATOR_TIMEOUT);
    }

    /**
     * Clear typing indicator
     */
    function clearTypingIndicator() {
        dom.typingIndicator.classList.remove("active");
    }

    /**
     * Auto-scroll to bottom if near bottom
     */
    function autoScroll() {
        const { scrollHeight, scrollTop, clientHeight } = dom.messagesContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        if (distanceFromBottom < CONFIG.AUTO_SCROLL_THRESHOLD) {
            dom.messagesContainer.scrollTo({
                top: scrollHeight,
                behavior: "smooth"
            });
        }
    }

    /**
     * Show error message to user
     */
    function showError(message) {
        console.error("❌", message);
        // TODO: Implement error toast/notification UI
    }

    /**
     * Show warning message to user
     */
    function showWarning(message) {
        console.warn("⚠️", message);
        // TODO: Implement warning toast/notification UI
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Message form submission
        dom.messageForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const text = dom.messageInput.value.trim();
            if (sendMessage(text)) {
                dom.messageInput.value = "";
                dom.messageInput.style.height = "auto";
            }
        });

        // Typing indicator
        dom.messageInput.addEventListener("input", () => {
            sendTypingIndicator();
        });

        // Handle unload
        window.addEventListener("beforeunload", () => {
            if (socket) {
                socket.close();
            }
        });
    }

    /**
     * Cleanup
     */
    function destroy() {
        if (socket) {
            socket.close();
        }
        clearTimeout(state.typingTimeout);
    }

    // Public API
    return {
        init,
        destroy,
        sendMessage,
        clearTypingIndicator,
        autoScroll
    };
})();

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    try {
        ChatManager.init();
    } catch (err) {
        console.error("❌ Failed to initialize chat:", err);
        document.body.innerHTML = '<div class="error">Failed to initialize chat application</div>';
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    ChatManager.destroy();
});