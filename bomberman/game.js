const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const TILE_SIZE = 40;
const ROWS = 13;
const COLS = 15;
const PLAYER_SPEED = 4; // px per frame
const BOMB_TIMER = 3000; // ms
const EXPLOSION_DURATION = 1000; // ms

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

// Game State
let lastTime = 0;
let score = 0;
let lives = 3;
let isGameOver = false;
let entities = [];
let bombs = [];
let explosions = [];
let map = []; // 2D array: 0=empty, 1=hard wall, 2=soft wall

// Initialize Map
function initMap() {
    map = [];
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 || (r % 2 === 0 && c % 2 === 0)) {
                row.push(1); // Hard Wall
            } else if (Math.random() < 0.4 && !(r === 1 && c === 1) && !(r === 1 && c === 2) && !(r === 2 && c === 1)) {
                row.push(2); // Soft Wall
            } else {
                row.push(0); // Empty
            }
        }
        map.push(row);
    }
}

class Player {
    constructor() {
        this.reset();
        this.spriteColor = '#fff';
        this.radius = TILE_SIZE * 0.4;
    }

    reset() {
        this.x = TILE_SIZE * 1.5;
        this.y = TILE_SIZE * 1.5;
        this.dx = 0;
        this.dy = 0;
        this.bombCount = 1;
        this.isDead = false;
    }

    update() {
        if (this.isDead) return;

        let nextX = this.x + this.dx * PLAYER_SPEED;
        let nextY = this.y + this.dy * PLAYER_SPEED;

        if (!this.checkCollision(nextX, this.y)) this.x = nextX;
        if (!this.checkCollision(this.x, nextY)) this.y = nextY;
    }

    checkCollision(x, y) {
        // Pixel to Grid collision
        const margin = 2;
        const testPoints = [
            { x: x - this.radius + margin, y: y - this.radius + margin },
            { x: x + this.radius - margin, y: y - this.radius + margin },
            { x: x - this.radius + margin, y: y + this.radius - margin },
            { x: x + this.radius - margin, y: y + this.radius - margin }
        ];

        for (let p of testPoints) {
            let c = Math.floor(p.x / TILE_SIZE);
            let r = Math.floor(p.y / TILE_SIZE);
            if (map[r][c] !== 0) return true; // Wall collision

            // Bomb collision (can walk through own bomb if standing on it initially, but usually solid)
            // Simplified: Bombs are solid once you leave existing
            for (let bomb of bombs) {
                if (bomb.isSolid && r === bomb.r && c === bomb.c) return true;
            }
        }
        return false;
    }

    draw() {
        if (this.isDead) return;
        ctx.fillStyle = this.spriteColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 2, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    placeBomb() {
        if (this.isDead || bombs.filter(b => b.owner === this).length >= this.bombCount) return;

        let r = Math.floor(this.y / TILE_SIZE);
        let c = Math.floor(this.x / TILE_SIZE);

        // Check if bomb already exists there
        if (bombs.some(b => b.r === r && b.c === c)) return;

        bombs.push(new Bomb(r, c, this));
    }
}

class Bomb {
    constructor(r, c, owner) {
        this.r = r;
        this.c = c;
        this.owner = owner;
        this.timer = BOMB_TIMER;
        this.isSolid = false; // Initially not solid so player doesn't get stuck

        // Make solid after player leaves the square
        setTimeout(() => {
            // Simple check: if player is not in this tile anymore, it becomes solid.
            // For this basic version, we'll just make it solid after a short delay
            this.isSolid = true;
        }, 500);
    }

    update(dt) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.explode();
        }
    }

    explode() {
        // Create explosion
        explosions.push(new Explosion(this.r, this.c));

        // Range 1 for now
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let dir of directions) {
            let r = this.r + dir[0];
            let c = this.c + dir[1];

            if (map[r][c] === 1) continue; // Hard wall stops explosion

            explosions.push(new Explosion(r, c));

            if (map[r][c] === 2) {
                map[r][c] = 0; // Destroy soft wall
                score += 10;
                updateUI();
                break; // Stop explosion propagation
            }
        }

        // Remove self
        bombs = bombs.filter(b => b !== this);
    }

    draw() {
        let x = this.c * TILE_SIZE + TILE_SIZE / 2;
        let y = this.r * TILE_SIZE + TILE_SIZE / 2;

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Warning pulsating
        let pulse = Math.sin(Date.now() / 100) * 5;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE * 0.2 + (pulse > 0 ? pulse / 2 : 0), 0, Math.PI * 2);
        ctx.fill();
    }
}

class Explosion {
    constructor(r, c) {
        this.r = r;
        this.c = c;
        this.timer = EXPLOSION_DURATION;
    }

    update(dt) {
        this.timer -= dt;

        // Check collisions against player
        let px = Math.floor(player.x / TILE_SIZE);
        let py = Math.floor(player.y / TILE_SIZE);
        if (px === this.c && py === this.r && !player.isDead) {
            playerDie();
        }

        // Check collisions against enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            // Центр врага
            let ex = Math.floor((e.x + TILE_SIZE / 2) / TILE_SIZE);
            let ey = Math.floor((e.y + TILE_SIZE / 2) / TILE_SIZE);
            if (ex === this.c && ey === this.r) {
                enemies.splice(i, 1);
                score += 100;
                updateUI();
            }
        }
    }

    draw() {
        let x = this.c * TILE_SIZE;
        let y = this.r * TILE_SIZE;

        ctx.fillStyle = `rgba(255, 100, 0, ${this.timer / EXPLOSION_DURATION})`;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = `rgba(255, 255, 0, ${this.timer / EXPLOSION_DURATION})`;
        ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    }
}

class Enemy {
    constructor(r, c) {
        this.r = r;
        this.c = c;
        this.x = c * TILE_SIZE; // Координата верхнего левого угла спрайта (для отрисовки и логики)
        this.y = r * TILE_SIZE;
        this.radius = TILE_SIZE * 0.4; // Немного меньше для визуализации
        this.speed = 1; // УМЕНЬШЕННАЯ СКОРОСТЬ (было 2)

        // Направление: 0: up, 1: right, 2: down, 3: left
        this.dir = Math.floor(Math.random() * 4);
        this.moving = true;
    }

    update(dt) {
        // Логика движения по клеткам
        // Мы двигаемся от центра одной клетки к центру другой (или от угла до угла, так как x,y это top-left)

        // Враг "выровнен", если его координаты кратны размеру клетки
        const isAligned = (this.x % TILE_SIZE === 0) && (this.y % TILE_SIZE === 0);

        if (isAligned) {
            // Мы в узле сетки (ровно в клетке). Принимаем решение куда идти.
            const r = Math.round(this.y / TILE_SIZE);
            const c = Math.round(this.x / TILE_SIZE);
            this.r = r;
            this.c = c;

            const possibleDirs = [];
            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // UP, RIGHT, DOWN, LEFT

            // Проверяем все 4 направления
            for (let i = 0; i < 4; i++) {
                // Не разворачиваемся назад сразу, если есть другие пути, кроме тупика
                // Но для простоты сначала соберем ВСЕ легальные ходы
                let nr = r + dirs[i][1];
                let nc = c + dirs[i][0];
                if (this.canMoveTo(nr, nc)) {
                    possibleDirs.push(i);
                }
            }

            if (possibleDirs.length === 0) {
                // Тупик со всех сторон? (вряд ли, но стоим)
                this.dir = -1;
            } else {
                // Логика выбора:
                // 1. Если можем идти прямо, с большим шансом идем прямо.
                // 2. Если уперлись, выбираем из доступных.
                // 3. На перекрестке (больше 2 путей) есть шанс повернуть.

                const canGoStraight = possibleDirs.includes(this.dir);
                const isIntersection = possibleDirs.length > 2;

                if (canGoStraight && !isIntersection) {
                    // Коридор или поворот только в одну сторону (не перекресток в прямом смысле)
                    // Но если possibleDirs содержит current dir, значит прямо путь свободен.
                    // Если это просто коридор (всего 2 выхода: назад и вперед), идем вперед.
                    // Проверим, не хотим ли мы случайно развернуться (очень редко)
                    if (Math.random() < 0.01) {
                        this.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                    }
                    // Иначе сохраняем this.dir
                } else if (canGoStraight && isIntersection) {
                    // Перекресток, можем идти прямо.
                    // 70% прямо, 30% повернуть
                    if (Math.random() < 0.3) {
                        // Выбираем любое доступное, КРОМЕ обратного (чтобы не дергался назад)
                        // Обратное к dir: (dir + 2) % 4
                        const filtered = possibleDirs.filter(d => d !== (this.dir + 2) % 4);
                        this.dir = filtered[Math.floor(Math.random() * filtered.length)];
                    }
                } else {
                    // Уперлись в стену или вынуждены повернуть.
                    // Выбираем из доступных. Стараемся не идти назад, если есть выбор.
                    const backDir = (this.dir + 2) % 4;
                    const forwardOptions = possibleDirs.filter(d => d !== backDir);

                    if (forwardOptions.length > 0) {
                        this.dir = forwardOptions[Math.floor(Math.random() * forwardOptions.length)];
                    } else {
                        // Тупик, идем назад
                        this.dir = possibleDirs[0];
                    }
                }
            }
        }

        // Выполняем движение
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        if (this.dir !== -1) {
            this.x += dirs[this.dir][0] * this.speed;
            this.y += dirs[this.dir][1] * this.speed;
        }

        // Проверка коллизии с игроком (простая дистанция)
        // Используем центры для проверки
        let centerX = this.x + TILE_SIZE / 2;
        let centerY = this.y + TILE_SIZE / 2;
        let dx = centerX - player.x;
        let dy = centerY - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Радиусы немного уменьшим для "прощения" игрока
        if (dist < (TILE_SIZE * 0.3 + player.radius) && !player.isDead) {
            playerDie();
        }
    }

    canMoveTo(r, c) {
        // Check grid bounds
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;

        // Check map walls
        if (map[r][c] !== 0) return false;

        // Check bombs (solid for enemies)
        for (let b of bombs) {
            if (b.r === r && b.c === c && b.isSolid) return false;
        }

        return true;
    }

    draw() {
        let centerX = this.x + TILE_SIZE / 2;
        let centerY = this.y + TILE_SIZE / 2;

        ctx.fillStyle = '#ff00ff';
        // Blob shape
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyes
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Left eye
        ctx.moveTo(centerX - 6, centerY - 4);
        ctx.lineTo(centerX - 2, centerY + 2);
        // Right eye
        ctx.moveTo(centerX + 6, centerY - 4);
        ctx.lineTo(centerX + 2, centerY + 2);
        ctx.stroke();
        ctx.lineWidth = 1; // reset
    }
}

// Game Logic
let player = new Player();
let enemies = [];

function spawnEnemies(count) {
    enemies = [];
    let spawned = 0;
    while (spawned < count) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        // Don't spawn near player (top-left corner)
        if (r > 4 && c > 4 && map[r][c] === 0) {
            enemies.push(new Enemy(r, c));
            spawned++;
        }
    }
}

function playerDie() {
    console.log("Player died");
    player.isDead = true;
    lives--;
    updateUI();

    if (lives > 0) {
        setTimeout(() => {
            player.reset();
        }, 1500);
    } else {
        setTimeout(gameOver, 1500);
    }
}

function gameOver() {
    isGameOver = true;
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

function restartGame() {
    score = 0;
    lives = 3;
    isGameOver = false;
    gameOverScreen.classList.add('hidden');
    updateUI();
    initMap();
    player.reset();
    spawnEnemies(5);
    bombs = [];
    explosions = [];
}

function updateUI() {
    scoreEl.innerText = score;
    livesEl.innerText = lives;
}

// Input Handling
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.code === 'Space') player.placeBomb();
});
window.addEventListener('keyup', e => keys[e.key] = false);

function handleInput() {
    player.dx = 0;
    player.dy = 0;
    if (keys['ArrowUp'] || keys['w']) player.dy = -1;
    if (keys['ArrowDown'] || keys['s']) player.dy = 1;
    if (keys['ArrowLeft'] || keys['a']) player.dx = -1;
    if (keys['ArrowRight'] || keys['d']) player.dx = 1;
}

// Main Loop
function loop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    if (!isGameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear Canvas

        // Draw Map
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let x = c * TILE_SIZE;
                let y = r * TILE_SIZE;

                // Ground
                ctx.fillStyle = '#2d2d2d';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#333';
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

                if (map[r][c] === 1) { // Hard Wall
                    ctx.fillStyle = '#888';
                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    // 3D effect bevel
                    ctx.fillStyle = '#aaa';
                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 4);
                    ctx.fillRect(x + 2, y + 2, 4, TILE_SIZE - 4);
                } else if (map[r][c] === 2) { // Soft Wall
                    ctx.fillStyle = '#b76e26'; // Brick color
                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    // Brick lines
                    ctx.strokeStyle = '#754516';
                    ctx.beginPath();
                    ctx.moveTo(x, y + TILE_SIZE / 2);
                    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
                    ctx.moveTo(x + TILE_SIZE / 2, y);
                    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
                    ctx.moveTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
                    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
                    ctx.stroke();
                }
            }
        }

        handleInput();
        player.update();
        player.draw();

        bombs.forEach(b => {
            b.update(dt);
            b.draw();
        });

        explosions = explosions.filter(e => e.timer > 0);
        explosions.forEach(e => {
            e.update(dt);
            e.draw();
        });

        enemies.forEach(e => {
            e.update(dt);
            e.draw();
        });
    }

    requestAnimationFrame(loop);
}

// Start Game
restartBtn.addEventListener('click', restartGame);
initMap();
spawnEnemies(5);
requestAnimationFrame(loop);
