(function () {
    let canvas = document.getElementById("main-canvas");
    let ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;
    function ctxClear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    function ctxCircle(x, y, r, isSpec, isQues) {
        // console.log("# ctxCircle:", x, y, r, isSpec);
        ctx.strokeStyle = "#ff0000";
        ctx.fillStyle = "rgba(195,186,0,0.6)";
        if (isSpec) {
            ctx.fillStyle = "rgba(60,90,255,0.6)";
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        if (isQues) ctx.stroke();
        ctx.fill();
    }
    function ctxScene(circles, showSpec) {
        ctxClear();
        for (let i = 0; i < circles.length; i++) {
            let params = circles[i];
            let { x, y, r, isSpec, isQues } = params;
            ctxCircle(x, y, r, isSpec && showSpec, isQues);
        }
    }
    function circleDis(circle1, circle2) {
        let relx = circle2.x;
        let rely = circle2.y;
        let x = circle1.x;
        let y = circle1.y;
        return Math.sqrt((x - relx) * (x - relx) + (y - rely) * (y - rely));
    }
    function circleMinus(circle1, circle2) {
        return { 'dx': circle2.x - circle1.x, 'dy': circle2.y - circle1.y };
    }
    function vecClamp(vx, vy, maxLen) {
        let len = Math.sqrt((vx) * (vx) + (vy) * (vy));
        if (len > maxLen) {
            let fac = maxLen / len;
            console.log("# vecClamp fac=", fac);
            return { "vx": vx * fac, "vy": vy * fac };
        } else {
            return { "vx": vx, "vy": vy };
        }
    }
    let maxV = 5;
    function initScene(num, specNum, radius) {
        let circles = [];
        let left = radius, top = radius, right = canvas.width - radius, bottom = canvas.height - radius;
        let validWidth = right - left, validHeight = bottom - top;
        let notAcceptableCount = 0;
        let i = 0;
        while (i < num) {
            let x = Math.random() * validWidth + left;
            let y = Math.random() * validHeight + top;
            let isAcceptable = true;
            for (let j = 0; j < circles.length; j++) {
                let dis = circleDis(circles[j], { x: x, y: y });
                if (dis < 2 * radius + radius / 10) isAcceptable = false;
            }
            if (!isAcceptable && notAcceptableCount < 10) {
                notAcceptableCount++;
                continue;
            }
            notAcceptableCount = 0;
            circles.push({
                x: x,
                y: y,
                r: radius,
                isSpec: i < specNum,
                vx: Math.random() * 2 * maxV - maxV,
                vy: Math.random() * 2 * maxV - maxV,
                tx: x,
                ty: y,
            });
            i++;
        }
        return circles;
    }
    let repulsiveFactor = 1.0;
    let offsetR = 10;
    function moveScene(circles) {
        for (let i = 0; i < circles.length; i++) {
            let circle = circles[i];
            circle.x += circle.vx;
            circle.y += circle.vy;
            if (circle.x + circle.r > canvas.width) {
                circle.vx = - Math.abs(circle.vx);
                circle.x += 2 * circle.vx;
            }
            if (circle.x - circle.r < 0) {
                circle.vx = Math.abs(circle.vx);
                circle.x += 2 * circle.vx;
            }
            if (circle.y + circle.r > canvas.height) {
                circle.vy = - Math.abs(circle.vy);
                circle.y += 2 * circle.vy;
            }
            if (circle.y - circle.r < 0) {
                circle.vy = Math.abs(circle.vy);
                circle.y += 2 * circle.vy;
            }
            for (let j = 0; j < circles.length; j++) {
                if (j === i) continue;
                let dis = circleDis(circles[j], circle);
                let sumr = circle.r + circles[j].r + offsetR;
                if (dis < 2.5 * sumr) {
                    let diff = circleMinus(circles[j], circle);
                    let dvx = repulsiveFactor * (diff.dx / dis) * Math.pow((sumr / dis), 2);
                    let dvy = repulsiveFactor * (diff.dy / dis) * Math.pow((sumr / dis), 2);
                    let { vx, vy } = vecClamp(circle.vx + dvx, circle.vy + dvy, maxV);
                    circle.vx = vx;
                    circle.vy = vy;
                }
            }
        }
    }
    function updateVs(circles) {
        for (let i = 0; i < circles.length; i++) {
            let circle = circles[i];
            if (Math.random() < 0.5) {
                circle.vx = Math.random() * 2 * maxV - maxV;
                circle.vy = Math.random() * 2 * maxV - maxV;
            }
        }
    }
    let isTesting = false;
    function testIt(totalNum, specNum, ballRadius) {
        if (isTesting) {
            alert("# 正在运行, 重复运行无效.");
            return;
        }
        isTesting = true;
        let frameCount = 0;
        let circles = initScene(totalNum, specNum, ballRadius);
        let timer = setInterval(() => {
            if (frameCount < 60) {
                ctxScene(circles, true);
            } else if (frameCount < 340){
                if (frameCount % 30 === 0) updateVs(circles);
                moveScene(circles);
                ctxScene(circles, frameCount < 100);
            } else {
                let i = Math.floor(Math.random() * circles.length);
                circles[i].isQues = true;
                ctxScene(circles, false);
                clearInterval(timer);
                setTimeout(() => {
                    let result = prompt("是蓝色吗? (y/n)");
                    if (result == "y" && circles[i].isSpec) alert("恭喜! 正确.");
                    else if (result == "n" && (!circles[i].isSpec)) alert("恭喜! 正确.");
                    else alert("结果不正确. 正确结果是: " + (circles[i].isSpec ? "y" : "n"));
                    ctxScene(circles, true);
                    isTesting = false;
                }, 1000);
                
            }
            frameCount++;
        }, 40);
    }
    let elems = document.getElementsByClassName("start-movcircle-btn");
    
    for (let i = 0; i < elems.length; i++) {
        let elem = elems[i];
        elem.addEventListener("click", () => {
            let idx = parseInt(elem.innerText.split(" ")[1]);
            let ballCount = parseInt(document.getElementById("input-ball-count").value);
            let ballRadius = parseInt(document.getElementById("input-ball-radius").value);
            console.log("# 测试:", idx);
            testIt(ballCount, idx, ballRadius);
        });
    }
})();