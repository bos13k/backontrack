let {
    init,
    getContext,
    initPointer,
    track,
    initKeys,
    keyPressed,
    load,
    setImagePath,
    imageAssets,
    Sprite,
    GameLoop } = kontra;
let { canvas, context } = init();
initPointer();
initKeys();
let dpi = window.devicePixelRatio;
canvas.setAttribute('width',
    getComputedStyle(canvas).getPropertyValue('width').slice(0, -2) * dpi);
canvas.setAttribute('height',
    getComputedStyle(canvas).getPropertyValue('height').slice(0, -2) * dpi);
let ctx = getContext();
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;
let COLOR_SAFE = '#5cb85c';
let COLOR_WARNING = '#f0ad4e';
let COLOR_DANGER = '#d9534f';
let HALF_WIDTH = canvas.width / 2;
let HALF_HEIGHT = canvas.height / 2;
let HALF_TRACK_WIDTH = 60;
let AIRCRAFT_WIDTH = 160;
let AIRCRAFT_HEIGHT = 160;
let FLY_SPEED = 3;
// 0: homepage, 1: game, 2: gameover
var state = 0;
var lostColor = COLOR_SAFE;
var interval = 360;
var aircrafts = [];
var slctedAcft = null;
var message = false;
// 0: not showed yet, 1: first time showing, 2: showed
var rainbowMsg = 0;
var showGameOver = false;
var score = 0;
var lost = 0;
var fire;

/**
 * Override collision function 
 */
function collidesWith(object) {
    let dx = this.x - object.x;
    let dy = this.y - object.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 144;
}

/**
 * Load all imgs
 */
setImagePath('img');
load(
    'title.png',
    'unselected.png',
    'selected.png',
    'rainbow.png',
    'sea.png',
    'tower.png',
    'back.png',
    'fire.png'
).then(function() {
    /**
     * Background setup
     */
    let homepageAcft = Sprite({
        x: 0,
        y: HALF_HEIGHT,
        anchor: {x:1, y:0.5},
        dx: 5,
        width: AIRCRAFT_WIDTH,
        height: AIRCRAFT_HEIGHT,
        image: imageAssets['unselected']
    });

    function drawHomepage() {
        let title = imageAssets['title'];
        titleX = HALF_WIDTH - title.width * 10;
        titleY = HALF_HEIGHT - title.height * 10 - AIRCRAFT_HEIGHT - 20;
        ctx.drawImage(title, titleX, titleY, title.width * 20, title.height * 20);
        ctx.font = "60px arial";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText("Click on an airplane to control.",
            HALF_WIDTH, HALF_HEIGHT + AIRCRAFT_HEIGHT + 20);
        ctx.fillText("Use A / D or arrow keys left / right to adjust the direction.",
            HALF_WIDTH, HALF_HEIGHT + AIRCRAFT_HEIGHT + 120);
        ctx.fillText("Enter the runway with a suitable angle for landing.",
            HALF_WIDTH, HALF_HEIGHT + AIRCRAFT_HEIGHT + 220);
        ctx.fillText("Press ENTER to start.",
            HALF_WIDTH, HALF_HEIGHT + AIRCRAFT_HEIGHT + 320);
    }

    function drawSea() {
        ctx.drawImage(imageAssets['sea'], 0, 0, canvas.width * 0.3, canvas.height);
    }

    function drawTower() {
        let tower = imageAssets['tower'];
        towerW = tower.width * 15;
        towerH = tower.height * 15;
        towerX = canvas.width * 0.75;
        towerY = (HALF_HEIGHT - HALF_TRACK_WIDTH - towerH) * 0.8;
        ctx.drawImage(tower, towerX, towerY, towerW, towerH);
    }

    function drawScoreAndLost() {
        ctx.font = "60px arial";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "right";
        ctx.fillText("Score: " + score, canvas.width - 20, 80);
        ctx.fillStyle = lostColor;
        ctx.textAlign = "right";
        ctx.fillText("Lost: " + lost, canvas.width - 20, 160);
    }

    function showCenterHint(hint, y) {
        ctx.font = "40px arial";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText(hint, canvas.width / 2, y);
    }

    function drawFire(fire) {
        let fireImg = imageAssets['fire'];
        ctx.drawImage(fireImg, fire[0] - AIRCRAFT_WIDTH / 2, fire[1] - AIRCRAFT_HEIGHT / 2,
            AIRCRAFT_WIDTH, AIRCRAFT_HEIGHT);
        ctx.drawImage(fireImg, fire[2] - AIRCRAFT_WIDTH / 2, fire[3] - AIRCRAFT_HEIGHT / 2,
            AIRCRAFT_WIDTH, AIRCRAFT_HEIGHT);
    }

    function showGameOver() {
        ctx.font = "80px arial";
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER!!!", canvas.width / 2, 160);
        ctx.fillText("Press ENTER to play again.", canvas.width / 2, 320);
    }

    function reset() {
        lostColor = COLOR_SAFE;
        interval = 360;
        aircrafts = [];
        slctedAcft = null;
        message = false;
        rainbowMsg = 0;
        showGameOver = false;
        score = 0;
        lost = 0;
        fire = null;
    }

    /**
     * Track setup
     */
    function drawTracks() {
        head = canvas.width * 0.3;
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(head, HALF_HEIGHT - HALF_TRACK_WIDTH);
        ctx.lineTo(canvas.width, HALF_HEIGHT - HALF_TRACK_WIDTH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(head, HALF_HEIGHT + HALF_TRACK_WIDTH);
        ctx.lineTo(canvas.width, HALF_HEIGHT + HALF_TRACK_WIDTH);
        ctx.stroke();
        // Make room for landing sign
        head += HALF_TRACK_WIDTH * 2;
        while (head < canvas.width) {
            ctx.beginPath();
            ctx.moveTo(head, HALF_HEIGHT);
            head += 60;
            ctx.lineTo(head, HALF_HEIGHT);
            head += 60;
            ctx.stroke();
        }
    }

    /**
     * Landing area setup
     */
    let landArea = Sprite({
        x: canvas.width * 0.3 + HALF_TRACK_WIDTH,
        y: HALF_HEIGHT,
        alpha: 1,
        flashoff: true,
        update: function() {
            if (this.alpha < 0) {
                this.alpha = 0;
                this.flashoff = false;
            }
            if (this.alpha > 1) {
                this.alpha = 1;
                this.flashoff = true;
            }
            if (this.flashoff) {
                this.alpha -= 0.02;
            } else {
                this.alpha += 0.02;
            }
        },
        render: function() {
            ctx.beginPath();
            ctx.rect(this.x - HALF_TRACK_WIDTH,
                HALF_HEIGHT - HALF_TRACK_WIDTH,
                HALF_TRACK_WIDTH * 2, HALF_TRACK_WIDTH * 2);
            ctx.fillStyle = 'rgba(255,255,255,' + this.alpha + ')';
            ctx.fill();
        },
        readyLanding: function(acft) {
            let dx = this.x - acft.x;
            let dy = this.y - acft.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            return distance < HALF_TRACK_WIDTH
                && acft.rotation < Math.PI / 4
                && acft.rotation > - Math.PI / 4;
        }
    });

    /**
     * Landing message
     */
    let msg = Sprite({
        x: canvas.width * 0.3 + HALF_TRACK_WIDTH * 4,
        y: HALF_HEIGHT,
        anchor: {x:0, y:0.5},
        width: HALF_TRACK_WIDTH * 3.6,
        height: HALF_TRACK_WIDTH * 1.2,
        dx: 0,
        ddx: 0.1,
        image: imageAssets['back']
    });

    /**
     * Aircrafts setup
     */
    function addAcft() {
        var x, y, rotation;
        // topleft:0, topright:1, bottomleft:2, bottomright:3
        let mode = Math.floor(Math.random() * 4);
        // 0: fix x, 1: fix y
        let fix = Math.floor(Math.random() * 2);
        switch (mode) {
            case 0:
                rotation = Math.random() * Math.PI / 6 + Math.PI / 6;
                if (fix == 0) {
                    x = 0;
                    y = Math.floor(Math.random() * HALF_HEIGHT);
                } else {
                    y = 0;
                    x = Math.floor(Math.random() * HALF_WIDTH);
                }
                break;
            case 1:
                rotation = Math.random() * Math.PI / 6 + Math.PI * 2 / 3;
                if (fix == 0) {
                    x = canvas.width;
                    y = Math.floor(Math.random() * HALF_HEIGHT);
                } else {
                    y = 0;
                    x = Math.floor(Math.random() * HALF_WIDTH) + HALF_WIDTH;
                }
                break;
            case 2:
                rotation = - (Math.random() * Math.PI / 6 + Math.PI / 6);
                if (fix == 0) {
                    x = 0;
                    y = Math.floor(Math.random() * HALF_HEIGHT) + HALF_HEIGHT;
                } else {
                    y = canvas.height;
                    x = Math.floor(Math.random() * HALF_WIDTH);
                }
                break;
            case 3:
                rotation = - (Math.random() * Math.PI / 6 + Math.PI * 2 / 3);
                if (fix == 0) {
                    x = canvas.width;
                    y = Math.floor(Math.random() * HALF_HEIGHT) + HALF_HEIGHT;
                } else {
                    y = canvas.height;
                    x = Math.floor(Math.random() * HALF_WIDTH) + HALF_WIDTH;
                }
                break;
            default:
                X = 0;
                y = HALF_HEIGHT;
                rotation = 0;
        };
        let newAcft = Sprite({
            x: x,
            y: y,
            anchor: {x: 0.5, y: 0.5},
            width: AIRCRAFT_WIDTH,
            height: AIRCRAFT_HEIGHT,
            rotation: rotation,
            rainbow: false,
            landed: false,
            selected: false,
            scored: false,
            image: imageAssets['unselected'],
            collidesWith: collidesWith,
            onDown: function() {
                if (!this.landed && !this.selected) {
                    if (slctedAcft != null) {
                        aircrafts[slctedAcft].selected = false;
                        aircrafts[slctedAcft].image = imageAssets['unselected'];
                    }
                    this.selected = true;
                    if (this.rainbow) {
                        this.image = imageAssets['rainbow'];
                        rainbowMsg += 1;
                    } else {
                        this.image = imageAssets['selected'];
                    }
                }
            }
        });
        if (Math.random() < 0.1) {
            newAcft.rainbow = true;
        }
        track(newAcft);
        aircrafts.push(newAcft);
    }
    addAcft();
    
    function updateAllAcfts() {
        aircrafts.forEach(function(acft, i) {
            acft.update();
            if (acft.rotation > Math.PI) {
                acft.rotation = - (Math.PI * 2 - acft.rotation);
            }
            if (acft.rotation < - Math.PI) {
                acft.rotation = Math.PI * 2 + acft.rotation;
            }
            if (acft.rainbow) {
                acft.dx = Math.cos(acft.rotation) * FLY_SPEED * 2;
                acft.dy = Math.sin(acft.rotation) * FLY_SPEED * 2;
            } else {
                acft.dx = Math.cos(acft.rotation) * FLY_SPEED;
                acft.dy = Math.sin(acft.rotation) * FLY_SPEED;
            }
            if (acft.selected) {
                slctedAcft = i;
                if (keyPressed('left') || keyPressed('a')) {
                    if (acft.rainbow) {
                        acft.rotation -= 0.04;
                    } else {
                        acft.rotation -= 0.02;
                    }
                }
                if (keyPressed('right') || keyPressed('d')) {
                    if (acft.rainbow) {
                        acft.rotation += 0.04;
                    } else {
                        acft.rotation += 0.02;
                    }
                }
            }
            if (landArea.readyLanding(acft)) {
                message = true;
                acft.landed = true;
                if (acft.selected) {
                    slctedAcft = null;
                    acft.selected = false;
                    acft.image = imageAssets['unselected'];
                }
            }
            if (acft.landed) {
                startLanding(acft);
                if (!acft.scored) {
                    if (acft.rainbow) {
                        score += 5;
                    } else {
                        score += 1;
                    }
                    acft.scored = true;
                }
            }
            if (!(acft.x >= 0 && acft.x <= canvas.width && acft.y >= 0 && acft.y <= canvas.height)) {
                if (acft.selected) {
                    slctedAcft = null;
                }
                if (!acft.scored) {
                    lost += 1;
                    if (lost > 1 && lost < 4) {
                        lostColor = COLOR_WARNING;
                    } else if (lost >= 4) {
                        lostColor = COLOR_DANGER;
                    }
                    if (lost >= 5) {
                        // Game Exit
                        state = 2;
                    }
                }
                aircrafts.splice(i, 1);
            }
        });
    }

    function renderAllAcfts() {
        aircrafts.forEach(function(acft, i) {
            aircrafts.forEach(function(acftelse, j) {
                if (i != j && !acft.landed && !acftelse.landed && acftelse.collidesWith(acft)) {
                    fire = [acft.x, acft.y, acftelse.x, acftelse.y];
                    // Game Exit
                    state = 2;
                }
            });
            acft.render();
        });
    };

    function startLanding(acft) {
        if (acft.width > 80) {
            acft.width *= 0.997;
            acft.height *= 0.997;
        }
        // Direction
        if (acft.rotation > 0.01) {
            acft.rotation -= 0.01;
        } else if (acft.rotation < -0.01) {
            acft.rotation += 0.01;
        } else {
            acft.rotation = 0;
        }
        // Y Position
        if (acft.y > HALF_HEIGHT + 1) {
            acft.y -= 1;
        } else if (acft.y < HALF_HEIGHT - 1) {
            acft.y += 1;
        } else {
            acft.y = HALF_HEIGHT;
        }
    }

    /**
     * Game loop
     */
    let tCount = 0;
    let hintCounter = 0;
    let rainbowCounter = 0;
    let loop = GameLoop({
        update: function() {
            if (state == 0) {
                homepageAcft.update();
                if (homepageAcft.x > canvas.width + homepageAcft.width) {
                    homepageAcft.x = 0;
                }
            } else if (state == 1) {
                tCount += 1;
                if (tCount >= interval) {
                    addAcft();
                    tCount = 0;
                }
                if (interval > 240) {
                    interval -= 0.05;
                }
                updateAllAcfts();
                landArea.update();
                if (message) {
                    msg.update();
                    if (msg.x > canvas.width) {
                        message = false;
                    }
                }
            }
        },
        render: function() {
            if (state == 0) {
                if (keyPressed('enter')) {
                    state += 1;
                }
                drawHomepage();
                homepageAcft.render();
            } else if (state == 2) {
                if (keyPressed('enter')) {
                    state = 1;
                    reset();
                    addAcft();
                }
                drawSea();
                drawTracks();
                drawTower();
                drawFire(fire);
                showGameOver();
            } else {
                drawTracks();
                drawTower();
                drawSea();
                landArea.render();
                if (message) {
                    msg.render();
                }
                renderAllAcfts();
                if (hintCounter < 480) {
                    showCenterHint("HINT: Avoid crash! Avoid signal lost!", 60)
                    hintCounter += 1;
                }
                if (rainbowMsg == 1) {
                    if (rainbowCounter < 480) {
                        showCenterHint("A Rainbow Airplane! Get it landed to score more.", 120);
                        rainbowCounter += 1;
                    } else {
                        rainbowMsg += 1;
                    }
                }
                drawScoreAndLost();
            }
        }
    });
    loop.start();
}).catch(function(err) {
    console.log(err);
});