// Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameState = {
    snake: [{ x: 200, y: 200 }],
    food: { x: 300, y: 300 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    bestScore: localStorage.getItem('bestScore') || 0,
    gameRunning: false,
    gamePaused: false,
    difficulty: 'normal',
    username: localStorage.getItem('username') || 'Player',
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
    particlesEnabled: localStorage.getItem('particlesEnabled') !== 'false'
};

const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Difficulty settings
const difficulties = {
    easy: { speed: 5, color: '#4CAF50' },
    normal: { speed: 8, color: '#2196F3' },
    hard: { speed: 12, color: '#FF9800' },
    insane: { speed: 18, color: '#F44336' }
};

let gameSpeed = difficulties[gameState.difficulty].speed;
let frameCount = 0;

// Particles
const particles = [];

// Initialize
function init() {
    loadBestScore();
    setupEventListeners();
    renderLeaderboard();
    document.getElementById('bestScore').textContent = gameState.bestScore;
}

// Setup Event Listeners
function setupEventListeners() {
    // Game buttons
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        document.getElementById('gameOverModal').style.display = 'none';
        startGame();
    });
    document.getElementById('shareBtn').addEventListener('click', shareScore);

    // Difficulty
    document.getElementById('difficultySelect').addEventListener('change', (e) => {
        gameState.difficulty = e.target.value;
        gameSpeed = difficulties[gameState.difficulty].speed;
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            const tabName = e.target.getAttribute('data-tab');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Settings
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        gameState.soundEnabled = e.target.checked;
        localStorage.setItem('soundEnabled', gameState.soundEnabled);
    });

    document.getElementById('particleToggle').addEventListener('change', (e) => {
        gameState.particlesEnabled = e.target.checked;
        localStorage.setItem('particlesEnabled', gameState.particlesEnabled);
    });

    document.getElementById('saveUsernameBtn').addEventListener('click', () => {
        const username = document.getElementById('usernameInput').value.trim();
        if (username) {
            gameState.username = username;
            localStorage.setItem('username', username);
            playSound('click');
        }
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
        if (confirm('Clear all game data?')) {
            localStorage.clear();
            location.reload();
        }
    });

    document.getElementById('buyPremiumBtn').addEventListener('click', buyPremium);

    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Mobile touch controls
    setupTouchControls();
}

// Start Game
function startGame() {
    gameState.snake = [{ x: 200, y: 200 }];
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.gameRunning = true;
    gameState.gamePaused = false;
    frameCount = 0;

    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    document.getElementById('score').textContent = '0';

    spawnFood();
    gameLoop();
    playSound('start');
}

// Game Loop
function gameLoop() {
    if (!gameState.gameRunning) return;

    frameCount++;

    if (frameCount >= (60 / gameSpeed)) {
        update();
        frameCount = 0;
    }

    draw();
    
    if (gameState.gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// Update Game State
function update() {
    if (gameState.gamePaused) return;

    gameState.direction = gameState.nextDirection;
    const head = gameState.snake[0];
    const newHead = {
        x: head.x + gameState.direction.x * gridSize,
        y: head.y + gameState.direction.y * gridSize
    };

    // Check collision with walls
    if (newHead.x < 0 || newHead.x >= canvas.width || newHead.y < 0 || newHead.y >= canvas.height) {
        endGame();
        return;
    }

    // Check collision with self
    if (gameState.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        endGame();
        return;
    }

    gameState.snake.unshift(newHead);

    // Check collision with food
    if (newHead.x === gameState.food.x && newHead.y === gameState.food.y) {
        gameState.score += 10;
        document.getElementById('score').textContent = gameState.score;
        playSound('eat');
        createParticles(gameState.food.x, gameState.food.y);
        spawnFood();

        // Level up every 5 foods
        const level = Math.floor(gameState.score / 50) + 1;
        document.getElementById('level').textContent = level;
    } else {
        gameState.snake.pop();
    }
}

// Draw Game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // Draw snake
    gameState.snake.forEach((segment, index) => {
        const gradient = ctx.createLinearGradient(segment.x, segment.y, segment.x + gridSize, segment.y + gridSize);
        if (index === 0) {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(1, '#00cc66');
        } else {
            gradient.addColorStop(0, '#00aa55');
            gradient.addColorStop(1, '#008844');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(segment.x + 1, segment.y + 1, gridSize - 2, gridSize - 2);

        // Head eyes
        if (index === 0) {
            ctx.fillStyle = '#000';
            const eyeOffset = 4;
            ctx.beginPath();
            ctx.arc(segment.x + eyeOffset, segment.y + eyeOffset, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(segment.x + gridSize - eyeOffset, segment.y + eyeOffset, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw food
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(gameState.food.x + gridSize / 2, gameState.food.y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw particles
    particles.forEach((particle, index) => {
        ctx.fillStyle = `rgba(255, 107, 107, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;

        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

// Spawn Food
function spawnFood() {
    let newFood;
    let collision = true;
    
    while (collision) {
        newFood = {
            x: Math.floor(Math.random() * tileCount) * gridSize,
            y: Math.floor(Math.random() * tileCount) * gridSize
        };
        collision = gameState.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    
    gameState.food = newFood;
}

// Handle Keyboard Input
function handleKeyPress(e) {
    const key = e.key.toLowerCase();
    
    if (key === 'arrowup' || key === 'w') {
        if (gameState.direction.y === 0) gameState.nextDirection = { x: 0, y: -1 };
    } else if (key === 'arrowdown' || key === 's') {
        if (gameState.direction.y === 0) gameState.nextDirection = { x: 0, y: 1 };
    } else if (key === 'arrowleft' || key === 'a') {
        if (gameState.direction.x === 0) gameState.nextDirection = { x: -1, y: 0 };
    } else if (key === 'arrowright' || key === 'd') {
        if (gameState.direction.x === 0) gameState.nextDirection = { x: 1, y: 0 };
    } else if (key === ' ') {
        if (gameState.gameRunning && !gameState.gamePaused) {
            pauseGame();
        } else if (gameState.gamePaused) {
            resumeGame();
        }
    }
}

// Touch Controls
function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    canvas.addEventListener('touchmove', (e) => {
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && gameState.direction.x === 0) {
                gameState.nextDirection = { x: 1, y: 0 };
            } else if (diffX < 0 && gameState.direction.x === 0) {
                gameState.nextDirection = { x: -1, y: 0 };
            }
        } else {
            if (diffY > 0 && gameState.direction.y === 0) {
                gameState.nextDirection = { x: 0, y: 1 };
            } else if (diffY < 0 && gameState.direction.y === 0) {
                gameState.nextDirection = { x: 0, y: -1 };
            }
        }
    });
}

// Pause/Resume
function pauseGame() {
    gameState.gamePaused = true;
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'inline-block';
}

function resumeGame() {
    gameState.gamePaused = false;
    document.getElementById('pauseBtn').style.display = 'inline-block';
    document.getElementById('resumeBtn').style.display = 'none';
}

// End Game
function endGame() {
    gameState.gameRunning = false;
    playSound('gameover');

    // Update best score
    if (gameState.score > gameState.bestScore) {
        gameState.bestScore = gameState.score;
        localStorage.setItem('bestScore', gameState.bestScore);
        document.getElementById('bestScoreMsg').textContent = '🎉 New Record!';
    } else {
        document.getElementById('bestScoreMsg').textContent = `Best: ${gameState.bestScore}`;
    }

    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOverModal').style.display = 'flex';
    
    // Save to leaderboard
    saveToLeaderboard();

    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

// Create Particles
function createParticles(x, y) {
    if (!gameState.particlesEnabled) return;
    
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x + gridSize / 2,
            y: y + gridSize / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 3 + 2,
            life: 1
        });
    }
}

// Sound Effects
function playSound(type) {
    if (!gameState.soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
            case 'eat':
                oscillator.frequency.value = 800;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'gameover':
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
            case 'start':
                oscillator.frequency.value = 600;
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
            case 'click':
                oscillator.frequency.value = 500;
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
        }
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Leaderboard Functions
function saveToLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    
    leaderboard.push({
        username: gameState.username,
        score: gameState.score,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    });

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 100);

    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    renderLeaderboard();
}

function renderLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';

    if (leaderboard.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">No scores yet. Play to get on the board!</p>';
        return;
    }

    leaderboard.slice(0, 10).forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.innerHTML = `
            <span class="medal">${medal}</span>
            <span class="name">${entry.username}</span>
            <span class="score">${entry.score}</span>
        `;
        list.appendChild(row);
    });
}

function loadBestScore() {
    gameState.bestScore = localStorage.getItem('bestScore') || 0;
}

// Share Score
function shareScore() {
    const text = `I scored ${gameState.score} points in ModernSnake Classic! 🐍 Can you beat my score? Play now!`;
    const url = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: 'ModernSnake Classic',
            text: text,
            url: url
        });
    } else {
        alert(text + '\n\n' + url);
    }
}

// Premium
function buyPremium() {
    alert('Premium features coming soon! Stripe & PayPal integration ready.');
}

// Initialize on load
window.addEventListener('load', init);
