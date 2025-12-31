// ===== GLOBAL VARIABLES =====
let currentScreen = 'intro';
let isPlaying = false; // Фоновая музыка выключена по умолчанию
let isGameSoundsEnabled = false; // Отдельно для звуков игры
let energyLevel = 0;
let clickCount = 0;
let energyMultiplier = 1.0;
let gameActive = false;
let gameScore = 0;
let starsCollected = 0;
let highScore = 0;
let gameInterval;
let stars = [];
let timeLeft = 30;
let isPaused = false;

// Catcher variables
let catcherX = 0;
let catcherWidth = 100;
let catcherSpeed = 8;
let touchStartX = 0;
let catcherStartX = 0;
let isTouching = false;

// Star spawning variables
let maxStarsOnScreen = 5;
let starSpawnInterval = null;
let starSpawnDelay = 800;

// Audio elements
const bgMusic = document.getElementById('bgMusic');
const clickSound = document.getElementById('clickSound');
const collectSound = document.getElementById('collectSound');
const successSound = document.getElementById('successSound');

// DOM Elements
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progressBar');
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');
const gameMusicBtn = document.getElementById('gameMusicBtn');
const notifications = document.getElementById('notifications');

// Keyboard state
const keys = {
    e: false,
    q: false
};

// ===== PRELOADER =====
window.addEventListener('load', () => {
    setTimeout(() => {
        preloader.classList.add('hidden');
        initApp();
    }, 1500);
});

// ===== INITIALIZE APP =====
function initApp() {
    setupAudio();
    setupNavigation();
    initFeverGame();
    initStarCatcher();
    loadProgress();
    setupKeyboardControls();
    
    // Initialize audio states
    updatePlayButton();
    updateGameMusicButton();
}

// ===== AUDIO SYSTEM =====
function setupAudio() {
    // Set initial volumes
    const volume = volumeSlider.value / 100;
    bgMusic.volume = volume * 0.3;
    clickSound.volume = 0.3; // Делаем звуки игр тише
    collectSound.volume = 0.3;
    successSound.volume = 0.3;
    
    // Volume control для фоновой музыки
    volumeSlider.addEventListener('input', function() {
        const volume = this.value / 100;
        bgMusic.volume = volume * 0.3;
        // Не меняем громкость игровых звуков слайдером
    });
    
    // Play/pause button для фоновой музыки
    playBtn.addEventListener('click', toggleBackgroundMusic);
    
    // Game music button
    gameMusicBtn.addEventListener('click', toggleGameSounds);
}

function toggleBackgroundMusic() {
    if (isPlaying) {
        pauseBackgroundMusic();
    } else {
        playBackgroundMusic();
    }
    updatePlayButton();
}

function toggleGameSounds() {
    isGameSoundsEnabled = !isGameSoundsEnabled;
    updateGameMusicButton();
    localStorage.setItem('gameSoundsEnabled', isGameSoundsEnabled);
    
    if (isGameSoundsEnabled) {
        showNotification('Звуки игры включены 🔊', 'success');
    } else {
        showNotification('Звуки игры выключены 🔇', 'info');
    }
}

function updateGameMusicButton() {
    const icon = gameMusicBtn.querySelector('i');
    const text = gameMusicBtn.querySelector('span');
    
    if (isGameSoundsEnabled) {
        icon.className = 'fas fa-volume-up';
        gameMusicBtn.classList.add('active');
        text.textContent = 'Звуки игры';
    } else {
        icon.className = 'fas fa-volume-mute';
        gameMusicBtn.classList.remove('active');
        text.textContent = 'Звуки игры';
    }
}

function playBackgroundMusic() {
    return new Promise((resolve, reject) => {
        bgMusic.play()
            .then(() => {
                isPlaying = true;
                updatePlayButton();
                resolve();
            })
            .catch(error => {
                console.log("Audio playback failed:", error);
                showNotification('Нажмите для включения музыки', 'info');
                reject(error);
            });
    });
}

function pauseBackgroundMusic() {
    bgMusic.pause();
    isPlaying = false;
    updatePlayButton();
}

function updatePlayButton() {
    const icon = playBtn.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
        playBtn.setAttribute('data-tooltip', 'Пауза');
    } else {
        icon.className = 'fas fa-play';
        playBtn.setAttribute('data-tooltip', 'Включить музыку');
    }
}

function playSound(sound) {
    if (sound && sound.readyState >= 2) {
        // Для игровых звуков проверяем отдельный флаг
        if (sound === clickSound || sound === collectSound || sound === successSound) {
            if (!isGameSoundsEnabled) return; // Не воспроизводим если звуки игры выключены
        }
        
        sound.currentTime = 0;
        sound.play().catch(e => {
            console.log("Sound play failed:", e.name);
        });
    }
}

// ===== NAVIGATION SYSTEM =====
function setupNavigation() {
    // Navigation dots
    document.querySelectorAll('.nav-dot').forEach(dot => {
        dot.addEventListener('click', function() {
            const target = this.dataset.target;
            switchScreen(target);
        });
    });
    
    // Start button
    document.getElementById('startBtn').addEventListener('click', function() {
        switchScreen('chapter1');
    });
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.dataset.target;
            if (target) {
                switchScreen(target);
            }
        });
    });
}

function switchScreen(screenId) {
    // Update navigation
    document.querySelectorAll('.nav-dot.active').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.nav-dot[data-target="' + screenId + '"]').forEach(d => d.classList.add('active'));
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    
    // Show target screen
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    
    // Update progress bar
    updateProgress(screenId);
    
    // Save progress
    localStorage.setItem('currentScreen', screenId);
    
    // Update final screen if needed
    if (screenId === 'final') {
        updateFinalScreen();
    }
}

function updateProgress(screenId) {
    const screens = ['intro', 'chapter1', 'chapter2', 'final'];
    const progress = (screens.indexOf(screenId) / (screens.length - 1)) * 100;
    progressBar.style.width = `${progress}%`;
}

// ===== CHAPTER 1: FEVER GAME =====
function initFeverGame() {
    const energyCircle = document.getElementById('energyCircle');
    const progressValue = energyCircle.querySelector('.progress-value');
    const chargeBtn = document.getElementById('chargeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const particlesContainer = document.getElementById('particlesContainer');
    const clickCountElement = document.getElementById('clickCount');
    const energyValueElement = document.getElementById('energyValue');
    const multiplierElement = document.getElementById('multiplier');
    
    function chargeEnergy() {
        if (energyLevel >= 100) return;
        
        energyLevel += 5 * energyMultiplier;
        if (energyLevel > 100) energyLevel = 100;
        
        clickCount++;
        
        // Update UI
        updateEnergyUI();
        createParticle();
        
        // Update multiplier
        energyMultiplier = 1 + Math.floor(energyLevel / 25) * 0.5;
        
        // Play sound
        playSound(collectSound);
        
        // Check achievement
        if (energyLevel >= 100) {
            showNotification('🎉 Поздравляем! Достигнута максимальная энергия!', 'success');
            playSound(successSound);
        }
        
        // Save progress
        saveFeverProgress();
    }
    
    function updateEnergyUI() {
        // Update circle progress
        energyCircle.style.background = `conic-gradient(
            var(--primary) 0%, 
            var(--secondary) ${energyLevel}%, 
            transparent ${energyLevel}%, 
            transparent 100%
        )`;
        
        // Update values
        progressValue.textContent = `${Math.round(energyLevel)}%`;
        clickCountElement.textContent = clickCount;
        energyValueElement.textContent = `${Math.round(energyLevel)}%`;
        multiplierElement.textContent = energyMultiplier.toFixed(1) + 'x';
    }
    
    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'energy-particle';
        
        // Random position
        const containerRect = particlesContainer.getBoundingClientRect();
        const x = Math.random() * containerRect.width;
        const y = Math.random() * containerRect.height;
        
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Random size and color
        const size = Math.random() * 15 + 10;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const colors = ['#667eea', '#764ba2', '#ff6b8b', '#ff8e53'];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        particlesContainer.appendChild(particle);
        
        // Animate particle
        animateParticle(particle);
    }
    
    function animateParticle(particle) {
        const startX = parseFloat(particle.style.left);
        const startY = parseFloat(particle.style.top);
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100 + 50;
        const duration = 1000;
        
        let startTime = null;
        
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const x = startX + Math.cos(angle) * distance * progress;
            const y = startY + Math.sin(angle) * distance * progress;
            
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.opacity = 1 - progress;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                particle.remove();
            }
        }
        
        requestAnimationFrame(step);
    }
    
    function resetEnergy() {
        energyLevel = 0;
        clickCount = 0;
        energyMultiplier = 1.0;
        
        updateEnergyUI();
        particlesContainer.innerHTML = '';
        
        saveFeverProgress();
        playSound(clickSound);
    }
    
    function saveFeverProgress() {
        const progress = {
            energyLevel,
            clickCount,
            energyMultiplier
        };
        localStorage.setItem('feverProgress', JSON.stringify(progress));
    }
    
    function loadFeverProgress() {
        const saved = localStorage.getItem('feverProgress');
        if (saved) {
            const progress = JSON.parse(saved);
            energyLevel = progress.energyLevel || 0;
            clickCount = progress.clickCount || 0;
            energyMultiplier = progress.energyMultiplier || 1.0;
            
            updateEnergyUI();
        }
    }
    
    // Event listeners
    chargeBtn.addEventListener('click', chargeEnergy);
    resetBtn.addEventListener('click', resetEnergy);
    energyCircle.addEventListener('click', chargeEnergy);
    
    // Load saved progress
    loadFeverProgress();
}

// ===== KEYBOARD CONTROLS =====
function setupKeyboardControls() {
    document.addEventListener('keydown', function(e) {
        const key = e.key.toLowerCase();
        
        if (key === 'e' || key === 'q') {
            keys[key] = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', function(e) {
        const key = e.key.toLowerCase();
        
        if (key === 'e' || key === 'q') {
            keys[key] = false;
        }
    });
    
    // Game loop for keyboard controls
    function gameLoop() {
        if (gameActive && !isPaused) {
            // Move catcher with keyboard
            if (keys.e) {
                catcherX += catcherSpeed;
            }
            if (keys.q) {
                catcherX -= catcherSpeed;
            }
            
            updateCatcherPosition();
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    gameLoop();
}

// ===== CHAPTER 2: STAR CATCHER GAME =====
function initStarCatcher() {
    const playArea = document.getElementById('playArea');
    const catcher = document.getElementById('catcher');
    const startGameBtn = document.getElementById('startGameBtn');
    const pauseGameBtn = document.getElementById('pauseGameBtn');
    const starsCountElement = document.getElementById('starsCount');
    const timeLeftElement = document.getElementById('timeLeft');
    const scoreElement = document.getElementById('score');
    
    // Initialize catcher
    catcherWidth = catcher.offsetWidth;
    catcherX = playArea.offsetWidth / 2 - catcherWidth / 2;
    updateCatcherPosition();
    
    function updateCatcherPosition() {
        const minX = 0;
        const maxX = playArea.offsetWidth - catcherWidth;
        catcherX = Math.max(minX, Math.min(catcherX, maxX));
        
        catcher.style.left = `${catcherX}px`;
    }
    
    // Touch controls for mobile
    setupTouchControls();
    
    function startGame() {
        if (gameActive) return;
        
        gameActive = true;
        isPaused = false;
        timeLeft = 30;
        starsCollected = 0;
        gameScore = 0;
        
        // Reset catcher position
        catcherX = playArea.offsetWidth / 2 - catcherWidth / 2;
        updateCatcherPosition();
        
        updateGameUI();
        clearStars();
        startStarSpawning();
        startTimer();
        
        showNotification('Игра началась! Лови звёзды!', 'info');
        
        // Play start sound
        playSound(clickSound);
    }
    
    function pauseGame() {
        isPaused = !isPaused;
        if (isPaused) {
            pauseGameBtn.innerHTML = '<i class="fas fa-play"></i> Продолжить';
            stopStarSpawning();
        } else {
            pauseGameBtn.innerHTML = '<i class="fas fa-pause"></i> Пауза';
            startStarSpawning();
        }
        playSound(clickSound);
    }
    
    function clearStars() {
        stars.forEach(star => {
            if (star.element && star.element.parentNode) {
                star.element.remove();
            }
        });
        stars = [];
    }
    
    function startStarSpawning() {
        if (starSpawnInterval) {
            clearInterval(starSpawnInterval);
        }
        
        // Create initial stars
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (gameActive && !isPaused) {
                    createStar();
                }
            }, i * 600);
        }
        
        // Spawn interval
        starSpawnInterval = setInterval(() => {
            if (gameActive && !isPaused && stars.length < maxStarsOnScreen) {
                createStar();
            }
        }, starSpawnDelay);
    }
    
    function stopStarSpawning() {
        if (starSpawnInterval) {
            clearInterval(starSpawnInterval);
            starSpawnInterval = null;
        }
    }
    
    function createStar() {
        if (!gameActive || isPaused || stars.length >= maxStarsOnScreen) return;
        
        const star = document.createElement('div');
        star.className = 'star';
        
        const margin = 20;
        const x = margin + Math.random() * (playArea.offsetWidth - 2 * margin - 24);
        star.style.left = `${x}px`;
        star.style.top = `-30px`;
        
        const speed = Math.random() * 1.5 + 1.2;
        
        playArea.appendChild(star);
        
        const starData = {
            element: star,
            x: parseFloat(x),
            y: -30,
            speed: speed,
            width: 24,
            height: 24,
            collected: false,
            animationId: null
        };
        
        stars.push(starData);
        animateStar(starData);
    }
    
    function animateStar(starData) {
        if (!starData.element.parentNode) return;
        
        let lastTime = null;
        
        function fall(timestamp) {
            if (!gameActive || isPaused || !starData.element.parentNode) {
                if (starData.animationId) cancelAnimationFrame(starData.animationId);
                return;
            }
            
            if (!lastTime) lastTime = timestamp;
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            
            const distance = starData.speed * (deltaTime / 16);
            starData.y += distance;
            starData.element.style.top = `${starData.y}px`;
            
            if (starData.y > playArea.offsetHeight) {
                removeStar(starData);
                return;
            }
            
            checkStarCollision(starData);
            starData.animationId = requestAnimationFrame(fall);
        }
        
        starData.animationId = requestAnimationFrame(fall);
    }
    
    function checkStarCollision(starData) {
        if (starData.collected) return;
        
        const catcherLeft = catcherX;
        const catcherRight = catcherX + catcherWidth;
        const catcherTop = playArea.offsetHeight - 60;
        const catcherBottom = playArea.offsetHeight - 30;
        
        const starCenterX = starData.x + starData.width / 2;
        const starCenterY = starData.y + starData.height / 2;
        const starRadius = starData.width / 2;
        
        const closestX = Math.max(catcherLeft, Math.min(starCenterX, catcherRight));
        const closestY = Math.max(catcherTop, Math.min(starCenterY, catcherBottom));
        
        const distanceX = starCenterX - closestX;
        const distanceY = starCenterY - closestY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance <= starRadius + 5) {
            collectStar(starData);
        }
    }
    
    function collectStar(starData) {
        if (starData.collected) return;
        starData.collected = true;
        
        if (starData.animationId) {
            cancelAnimationFrame(starData.animationId);
        }
        
        if (starData.element && starData.element.parentNode) {
            starData.element.classList.add('caught');
            setTimeout(() => {
                if (starData.element.parentNode) {
                    starData.element.remove();
                }
            }, 300);
        }
        
        starsCollected++;
        gameScore += 10;
        
        updateGameUI();
        
        playSound(collectSound);
        createStarParticle(starData.x + starData.width / 2, starData.y + starData.height / 2);
        
        if (gameScore > highScore) {
            highScore = gameScore;
            localStorage.setItem('starHighScore', highScore);
        }
        
        stars = stars.filter(s => s !== starData);
    }
    
    function createStarParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'star-particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.backgroundColor = 'gold';
        particle.style.boxShadow = '0 0 10px gold';
        
        playArea.appendChild(particle);
        
        let size = 5;
        let opacity = 1;
        let animationId;
        
        function animate() {
            size += 1;
            opacity -= 0.07;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.opacity = opacity;
            particle.style.borderRadius = '50%';
            particle.style.transform = `translate(-50%, -50%) scale(${size/5})`;
            
            if (opacity > 0) {
                animationId = requestAnimationFrame(animate);
            } else {
                if (particle.parentNode) {
                    particle.remove();
                }
                if (animationId) cancelAnimationFrame(animationId);
            }
        }
        
        animate();
    }
    
    function removeStar(starData) {
        if (starData.animationId) {
            cancelAnimationFrame(starData.animationId);
        }
        
        if (starData.element && starData.element.parentNode) {
            starData.element.remove();
        }
        
        stars = stars.filter(s => s !== starData);
    }
    
    function startTimer() {
        clearInterval(gameInterval);
        
        gameInterval = setInterval(() => {
            if (!isPaused && gameActive) {
                timeLeft--;
                timeLeftElement.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                    endGame();
                }
            }
        }, 1000);
    }
    
    function updateGameUI() {
        starsCountElement.textContent = starsCollected;
        scoreElement.textContent = gameScore;
    }
    
    function endGame() {
        gameActive = false;
        isPaused = false;
        clearInterval(gameInterval);
        stopStarSpawning();
        clearStars();
        
        showNotification(`Игра окончена! Собрано звёзд: ${starsCollected}`, 'info');
        playSound(successSound);
        
        localStorage.setItem('lastGameStars', starsCollected);
        localStorage.setItem('lastGameScore', gameScore);
        
        pauseGameBtn.innerHTML = '<i class="fas fa-pause"></i> Пауза';
    }
    
    function setupTouchControls() {
        // Touch controls
        playArea.addEventListener('touchstart', function(e) {
            if (!gameActive || isPaused) return;
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            catcherStartX = catcherX;
            isTouching = true;
            e.preventDefault();
        });
        
        playArea.addEventListener('touchmove', function(e) {
            if (!isTouching || !gameActive || isPaused) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            catcherX = catcherStartX + deltaX;
            
            updateCatcherPosition();
            e.preventDefault();
        });
        
        playArea.addEventListener('touchend', function(e) {
            isTouching = false;
        });
        
        // Mouse controls for desktop
        let isDragging = false;
        let mouseStartX = 0;
        
        playArea.addEventListener('mousedown', function(e) {
            if (!gameActive || isPaused) return;
            
            isDragging = true;
            mouseStartX = e.clientX;
            catcherStartX = catcherX;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging || !gameActive || isPaused) return;
            
            const deltaX = e.clientX - mouseStartX;
            catcherX = catcherStartX + deltaX;
            
            updateCatcherPosition();
        });
        
        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
    }
    
    // Event listeners
    startGameBtn.addEventListener('click', startGame);
    pauseGameBtn.addEventListener('click', pauseGame);
    
    // Load high score
    const savedHighScore = localStorage.getItem('starHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        if (document.getElementById('score')) {
            document.getElementById('score').textContent = highScore;
        }
    }
}

// ===== FINAL SCREEN =====
function updateFinalScreen() {
    document.getElementById('finalEnergy').textContent = `${Math.round(energyLevel)}%`;
    
    const lastStars = localStorage.getItem('lastGameStars') || 0;
    document.getElementById('finalStars').textContent = lastStars;
    
    const lastScore = localStorage.getItem('lastGameScore') || 0;
    document.getElementById('finalScore').textContent = lastScore;
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    notifications.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== PROGRESS MANAGEMENT =====
function loadProgress() {
    // Load current screen
    const savedScreen = localStorage.getItem('currentScreen');
    if (savedScreen && savedScreen !== 'intro') {
        switchScreen(savedScreen);
    }
    
    // Load game sounds state
    const savedGameSounds = localStorage.getItem('gameSoundsEnabled');
    if (savedGameSounds !== null) {
        isGameSoundsEnabled = savedGameSounds === 'true';
        updateGameMusicButton();
    }
}

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', initApp);

// Add CSS for energy particles and star effects
const style = document.createElement('style');
style.textContent = `
    .energy-particle {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        filter: blur(3px);
        animation: pulse 1s ease-out;
    }
    
    .star-particle {
        position: absolute;
        pointer-events: none;
        z-index: 2;
        transform: translate(-50%, -50%);
    }
    
    @keyframes pulse {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
    }
    
    .star {
        position: absolute;
        width: 24px;
        height: 24px;
        background: gold;
        clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
        z-index: 5;
        animation: twinkle 2s infinite alternate;
        transition: transform 0.2s ease;
    }
    
    @keyframes twinkle {
        0% {
            filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.6));
            transform: scale(1) rotate(0deg);
        }
        100% {
            filter: drop-shadow(0 0 12px rgba(255, 215, 0, 1));
            transform: scale(1.1) rotate(5deg);
        }
    }
    
    .star.caught {
        animation: catchStar 0.3s ease-out forwards !important;
    }
    
    @keyframes catchStar {
        0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 15px gold);
        }
        50% {
            transform: scale(1.8) rotate(180deg);
            opacity: 0.7;
            filter: drop-shadow(0 0 30px gold);
        }
        100% {
            transform: scale(0) rotate(360deg);
            opacity: 0;
            filter: drop-shadow(0 0 0px gold);
        }
    }
    
    /* Audio button tooltip */
    .audio-btn {
        position: relative;
    }
    
    .audio-btn::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: -40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.8rem;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s;
        pointer-events: none;
        z-index: 1000;
    }
    
    .audio-btn:hover::after {
        opacity: 1;
        visibility: visible;
    }
`;
document.head.appendChild(style);