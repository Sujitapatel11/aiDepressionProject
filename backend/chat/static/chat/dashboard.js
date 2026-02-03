// =======================================
// MINDSPACE DASHBOARD - ENHANCED
// =======================================

document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
    initializeGamification();
    initializeAnimations();
    initializeNotifications();
    initializeRealTimeUpdates();
});

// =======================================
// DASHBOARD INITIALIZATION
// =======================================

function initializeDashboard() {
    const username = "{{ request.user.username }}";
    
    // Update last visit
    updateLastVisit();
    
    // Track page view
    trackPageView('dashboard');
    
    // Initialize tooltips
    initializeTooltips();
    
    // Load user preferences
    loadUserPreferences();
}

// =======================================
// GAMIFICATION SYSTEM
// =======================================

function initializeGamification() {
    // Update login streak
    updateLoginStreak();
    
    // Display achievements
    displayAchievements();
    
    // Check for new milestones
    checkMilestones();
    
    // Update wellness score
    updateWellnessScore();
    
    // Level system
    updateUserLevel();
}

function updateLoginStreak() {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem('lastLogin');
    let streak = parseInt(localStorage.getItem('loginStreak') || '0');
    
    if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
            streak++;
            showStreakCelebration(streak);
        } else if (lastLogin) {
            // Streak broken
            if (streak > 0) {
                showStreakLost(streak);
            }
            streak = 1;
        } else {
            streak = 1;
        }
        
        localStorage.setItem('loginStreak', streak);
        localStorage.setItem('lastLogin', today);
    }
    
    // Update UI
    const streakValue = document.getElementById('streakValue');
    const streakProgress = document.getElementById('streakProgress');
    
    if (streakValue) {
        animateNumber(streakValue, 0, streak, 1000);
    }
    
    if (streakProgress) {
        const progressPercent = Math.min((streak / 30) * 100, 100);
        setTimeout(() => {
            streakProgress.style.width = progressPercent + '%';
        }, 300);
    }
}

function showStreakCelebration(streak) {
    let message = '';
    let icon = '🔥';
    let color = '#ff7b54';
    
    if (streak === 1) {
        message = 'Welcome back! Start your journey!';
        icon = '🌟';
    } else if (streak === 3) {
        message = '3 days in a row! Building momentum!';
        icon = '💪';
    } else if (streak === 7) {
        message = 'Full week! You\'re unstoppable!';
        icon = '🏆';
        color = '#10b981';
        createConfetti();
    } else if (streak === 14) {
        message = 'Two weeks! Incredible dedication!';
        icon = '🎯';
        color = '#8b5cf6';
        createConfetti();
    } else if (streak === 30) {
        message = 'ONE MONTH! You\'re a legend!';
        icon = '💎';
        color = '#f59e0b';
        createConfetti();
        unlockAchievement('30_day_streak');
    } else if (streak % 5 === 0) {
        message = `${streak} days! Keep the fire burning!`;
        icon = '🔥';
    } else {
        message = `${streak} day streak!`;
    }
    
    showNotification(message, icon, color);
}

function showStreakLost(oldStreak) {
    if (oldStreak >= 7) {
        showNotification(
            `Your ${oldStreak} day streak ended. Don't give up!`, 
            '💔', 
            '#ef4444'
        );
    }
}

function displayAchievements() {
    const achievements = getAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    
    // Could add achievement display to UI
    console.log(`Achievements: ${unlockedCount}/${achievements.length}`);
}

function getAchievements() {
    const defaultAchievements = [
        { id: 'first_login', name: 'First Steps', description: 'Logged in for the first time', icon: '👋', unlocked: true },
        { id: 'first_connection', name: 'Connected', description: 'Made your first connection', icon: '🤝', unlocked: false },
        { id: '3_connections', name: 'Social Butterfly', description: 'Have 3 active connections', icon: '🦋', unlocked: false },
        { id: '7_day_streak', name: 'Week Warrior', description: 'Maintain a 7 day streak', icon: '💪', unlocked: false },
        { id: '30_day_streak', name: 'Monthly Master', description: 'Maintain a 30 day streak', icon: '💎', unlocked: false },
        { id: 'help_5_people', name: 'Helper', description: 'Accept 5 support requests', icon: '❤️', unlocked: false },
    ];
    
    const saved = localStorage.getItem('achievements');
    return saved ? JSON.parse(saved) : defaultAchievements;
}

function unlockAchievement(achievementId) {
    const achievements = getAchievements();
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (achievement && !achievement.unlocked) {
        achievement.unlocked = true;
        localStorage.setItem('achievements', JSON.stringify(achievements));
        
        showAchievementUnlock(achievement);
    }
}

function showAchievementUnlock(achievement) {
    const popup = document.createElement('div');
    popup.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 15px">${achievement.icon}</div>
        <div style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #1a4d5e">Achievement Unlocked!</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px">${achievement.name}</div>
        <div style="font-size: 14px; opacity: 0.8">${achievement.description}</div>
    `;
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: linear-gradient(135deg, #ffffff, #f4f8fb);
        padding: 50px;
        border-radius: 28px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.4);
        z-index: 99999;
        text-align: center;
        min-width: 350px;
        border: 3px solid #4db8a8;
        animation: achievementPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards,
                   achievementOut 0.4s ease 3.5s forwards;
    `;
    
    document.body.appendChild(popup);
    createConfetti();
    playSuccessSound();
    
    setTimeout(() => popup.remove(), 4000);
    
    addAnimationStyles();
}

function checkMilestones() {
    const connectionsCount = parseInt(document.querySelector('.stat-value')?.textContent || '0');
    const requestsCount = parseInt(document.querySelectorAll('.stat-value')[1]?.textContent || '0');
    
    // Check connection milestones
    if (connectionsCount === 1) {
        unlockAchievement('first_connection');
    } else if (connectionsCount === 3) {
        unlockAchievement('3_connections');
    }
    
    // Check streak milestones
    const streak = parseInt(localStorage.getItem('loginStreak') || '0');
    if (streak === 7) {
        unlockAchievement('7_day_streak');
    } else if (streak === 30) {
        unlockAchievement('30_day_streak');
    }
}

function updateWellnessScore() {
    const score = calculateWellnessScore();
    
    // Animate wellness score
    const scoreElement = document.querySelector('.stat-card:last-child .stat-value');
    if (scoreElement) {
        const currentScore = parseInt(scoreElement.textContent);
        if (currentScore !== score) {
            animateNumber(scoreElement, currentScore, score, 1500);
        }
    }
}

function calculateWellnessScore() {
    const streak = parseInt(localStorage.getItem('loginStreak') || '0');
    const connections = parseInt(document.querySelector('.stat-value')?.textContent || '0');
    const totalLogins = parseInt(localStorage.getItem('totalLogins') || '0');
    
    let score = 0;
    
    // Streak contribution (max 40 points)
    score += Math.min(streak * 2, 40);
    
    // Connections contribution (max 30 points)
    score += Math.min(connections * 10, 30);
    
    // Engagement contribution (max 30 points)
    score += Math.min(totalLogins, 30);
    
    return Math.min(score, 100);
}

function updateUserLevel() {
    const totalLogins = parseInt(localStorage.getItem('totalLogins') || '0');
    const level = Math.floor(totalLogins / 10) + 1;
    const prevLevel = parseInt(localStorage.getItem('userLevel') || '1');
    
    if (level > prevLevel) {
        showLevelUp(level);
        localStorage.setItem('userLevel', level);
    }
}

function showLevelUp(level) {
    showNotification(`Level Up! You're now Level ${level}! 🎉`, '⬆️', '#8b5cf6');
    createConfetti();
}

// =======================================
// ANIMATIONS & EFFECTS
// =======================================

function initializeAnimations() {
    // Stagger card animations
    animateCards();
    
    // Add hover effects
    addHoverEffects();
    
    // Parallax effect
    addParallaxEffect();
    
    // Click ripple effects
    addRippleEffects();
}

function animateCards() {
    const cards = document.querySelectorAll('.stat-card, .section, .user-card, .connection-card, .request-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

function addHoverEffects() {
    const interactiveCards = document.querySelectorAll('.user-card, .connection-card, .request-card');
    
    interactiveCards.forEach(card => {
        card.addEventListener('mouseenter', function(e) {
            this.style.transition = 'all 0.3s ease';
            createSparkle(e.currentTarget);
        });
        
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
        });
    });
}

function addParallaxEffect() {
    let ticking = false;
    
    document.addEventListener('mousemove', (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const statCards = document.querySelectorAll('.stat-card');
                const x = e.clientX / window.innerWidth - 0.5;
                const y = e.clientY / window.innerHeight - 0.5;
                
                statCards.forEach((card, index) => {
                    const offset = (index + 1) * 5;
                    card.style.transform = `translateX(${x * offset}px) translateY(${y * offset}px)`;
                });
                
                ticking = false;
            });
            
            ticking = true;
        }
    });
}

function addRippleEffects() {
    const buttons = document.querySelectorAll('.btn, .btn-support, .btn-accept');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                left: ${x}px;
                top: ${y}px;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    addAnimationStyles();
}

function createSparkle(element) {
    const sparkleCount = 3;
    const rect = element.getBoundingClientRect();
    
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.textContent = '✨';
        sparkle.style.cssText = `
            position: fixed;
            left: ${rect.left + Math.random() * rect.width}px;
            top: ${rect.top + Math.random() * rect.height}px;
            pointer-events: none;
            z-index: 9999;
            font-size: 20px;
            animation: sparkleFloat 1s ease-out forwards;
        `;
        document.body.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 1000);
    }
}

function createConfetti() {
    const colors = ['#4db8a8', '#ff7b54', '#f9e5c9', '#2c6b7f', '#10b981', '#f59e0b'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            opacity: 1;
            pointer-events: none;
            z-index: 99999;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            animation: confettiFall ${2 + Math.random() * 2}s ease-out forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 4000);
    }
}

// =======================================
// NOTIFICATIONS
// =======================================

function initializeNotifications() {
    // Check for new requests periodically (if needed)
    // This would be replaced with WebSocket in production
    checkForUpdates();
}

function showNotification(message, icon = '🔔', color = '#4db8a8') {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <span style="font-size: 32px; margin-right: 15px">${icon}</span>
        <div>
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px">MindSpace</div>
            <div style="font-size: 14px; opacity: 0.95">${message}</div>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)});
        color: white;
        padding: 20px 25px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        display: flex;
        align-items: center;
        animation: slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                   slideOutRight 0.5s ease 4s forwards;
        min-width: 320px;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Play sound
    playNotificationSound();
    
    setTimeout(() => notification.remove(), 4500);
}

function checkForUpdates() {
    // Placeholder for real-time updates
    // In production, this would use WebSocket or polling
}

// =======================================
// REAL-TIME UPDATES
// =======================================

function initializeRealTimeUpdates() {
    // Update timestamps
    setInterval(updateTimestamps, 60000); // Every minute
    
    // Pulse online indicators
    pulseOnlineIndicators();
}

function updateTimestamps() {
    const timestamps = document.querySelectorAll('.request-details p');
    // Would update relative time displays
}

function pulseOnlineIndicators() {
    const dots = document.querySelectorAll('.status-dot');
    dots.forEach(dot => {
        dot.style.animation = 'pulse-dot 2s ease-in-out infinite';
    });
}

// =======================================
// UTILITY FUNCTIONS
// =======================================

function animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

function updateLastVisit() {
    const now = new Date();
    localStorage.setItem('lastVisit', now.toISOString());
    
    const totalLogins = parseInt(localStorage.getItem('totalLogins') || '0') + 1;
    localStorage.setItem('totalLogins', totalLogins);
}

function trackPageView(page) {
    const views = JSON.parse(localStorage.getItem('pageViews') || '{}');
    views[page] = (views[page] || 0) + 1;
    localStorage.setItem('pageViews', JSON.stringify(views));
}

function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    // Tooltip functionality already in CSS
}

function loadUserPreferences() {
    const theme = localStorage.getItem('theme') || 'light';
    const animations = localStorage.getItem('animations') !== 'false';
    
    if (!animations) {
        document.body.style.setProperty('--animation-speed', '0s');
    }
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

function playNotificationSound() {
    // Create a subtle notification sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Audio not supported or blocked
    }
}

function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Second note
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 1200;
            gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.5);
        }, 100);
    } catch (e) {
        // Audio not supported
    }
}

function addAnimationStyles() {
    if (document.getElementById('dashboard-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'dashboard-animations';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
        
        @keyframes sparkleFloat {
            0% {
                opacity: 0;
                transform: translateY(0) scale(0);
            }
            50% {
                opacity: 1;
                transform: translateY(-30px) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(-60px) scale(0);
            }
        }
        
        @keyframes confettiFall {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
            }
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        @keyframes achievementPop {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
            }
            100% {
                transform: translate(-50%, -50%) scale(1) rotate(360deg);
            }
        }
        
        @keyframes achievementOut {
            to {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
        }
        
        @keyframes pulse-dot {
            0%, 100% {
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            }
            50% {
                opacity: 0.6;
                box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
            }
        }
    `;
    document.head.appendChild(style);
}

// =======================================
// KEYBOARD SHORTCUTS
// =======================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for quick search (future feature)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Open search modal
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        // Close any open modals
    }
});

// =======================================
// DEBUG & DEVELOPMENT
// =======================================

console.log('%c🌊 MindSpace Dashboard ', 'font-size: 18px; font-weight: bold; color: #4db8a8; background: #1a4d5e; padding: 10px; border-radius: 5px;');
console.log('%cGamification Active | Wellness Tracking Enabled', 'color: #2c6b7f; font-size: 12px;');

// Expose debug functions
window.MindSpace = {
    showNotification,
    unlockAchievement,
    createConfetti,
    getStats: () => ({
        streak: localStorage.getItem('loginStreak'),
        level: localStorage.getItem('userLevel'),
        totalLogins: localStorage.getItem('totalLogins'),
        achievements: getAchievements()
    })
};