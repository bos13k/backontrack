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
let HALF_WIDTH = canvas.width / 2;
let HALF_HEIGHT = canvas.height / 2;
let HALF_TRACK_WIDTH = 60;
let FLY_SPEED = 3;
let ADD_INTERVAL = 300;
var aircrafts = [];
var slctedAcft = null;
var message = false;

/**
 * Load all imgs
 */
setImagePath('img');
load(
    'unselected.png',
    'selected.png',
    'sea.png',
    'tower.png',
    'back.png'
).then(function() {
    /**
     * Background setup
     */
    function drawSea() {
        ctx.drawImage(imageAssets['sea'], 0, 0, canvas.width * 0.3, canvas.height);
    };

    function drawTower() {
        tower = imageAssets['tower'];
        towerW = tower.width * 15;
        towerH = tower.height * 15;
        towerX = canvas.width * 0.75;
        towerY = (HALF_HEIGHT - HALF_TRACK_WIDTH - towerH) * 0.8;
        towerH
        ctx.drawImage(tower, towerX, towerY, towerW, towerH);
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
                rotation = Math.random() * Math.PI / 2;
                if (fix == 0) {
                    x = -100;
                    y = Math.floor(Math.random() * HALF_HEIGHT);
                } else {
                    y = -100;
                    x = Math.floor(Math.random() * HALF_WIDTH);
                }
                break;
            case 1:
                rotation = Math.random() * Math.PI / 2 + Math.PI / 2;
                if (fix == 0) {
                    x = canvas.width + 100;
                    y = Math.floor(Math.random() * HALF_HEIGHT);
                } else {
                    y = -100;
                    x = Math.floor(Math.random() * HALF_WIDTH) + HALF_WIDTH;
                }
                break;
            case 2:
                rotation = - Math.random() * Math.PI / 2;
                if (fix == 0) {
                    x = -100;
                    y = Math.floor(Math.random() * HALF_HEIGHT) + HALF_HEIGHT;
                } else {
                    y = canvas.height + 100;
                    x = Math.floor(Math.random() * HALF_WIDTH);
                }
                break;
            case 3:
                rotation = - (Math.random() * Math.PI / 2 + Math.PI / 2);
                if (fix == 0) {
                    x = canvas.width + 100;
                    y = Math.floor(Math.random() * HALF_HEIGHT) + HALF_HEIGHT;
                } else {
                    y = canvas.height + 100;
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
            width: 160,
            height: 180,
            rotation: rotation,
            landed: false,
            selected: false,
            image: imageAssets['unselected'],
            onDown: function() {
                if (!this.landed && !this.selected) {
                    if (slctedAcft != null) {
                        aircrafts[slctedAcft].selected = false;
                        aircrafts[slctedAcft].image = imageAssets['unselected'];
                    }
                    this.selected = true;
                    this.image = imageAssets['selected'];
                }
            }
        });
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
            acft.dx = Math.cos(acft.rotation) * FLY_SPEED;
            acft.dy = Math.sin(acft.rotation) * FLY_SPEED;
            if (acft.selected) {
                slctedAcft = i;
                if (keyPressed('left') || keyPressed('a')) {
                    acft.rotation -= 0.02;
                }
                if (keyPressed('right') || keyPressed('d')) {
                    acft.rotation += 0.02;
                }
            }
            if (landArea.readyLanding(acft)) {
                message = true;
                acft.landed = true;
                acft.selected = false;
                acft.image = imageAssets['unselected'];
            }
            if (acft.landed) {
                startLanding(acft);
            }
        });
    }

    function renderAllAcfts() {
        aircrafts.forEach(function(acft, i) {
            if (i != slctedAcft) {
                acft.render();
            }
        });
        aircrafts[slctedAcft].render();
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
    let loop = GameLoop({
        update: function() {
            tCount += 1;
            if (tCount >= ADD_INTERVAL) {
                addAcft();
                tCount = 0;
            }
            updateAllAcfts();
            landArea.update();
            if (message) {
                msg.update();
                if (msg.x > canvas.width) {
                    message = false;
                }
            }
        },
        render: function() {
            drawTracks();
            drawTower();
            drawSea();
            landArea.render();
            if (message) {
                msg.render();
            }
            renderAllAcfts();
        }
    });
    loop.start();
}).catch(function(err) {
    console.log(err);
});