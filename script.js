let quizData = [];
let idx = 0;
let score = 0;
let range = 1;
let difficulty = 1;

async function loadData(path) {
    return fetch(path).then(r => r.json());
}

// 模擬 Python 的 start_quiz 功能
async function startQuiz() {
    const chat = document.getElementById('chatbox');
    chat.innerHTML = "";
    addLeftText("正在生成題目，請稍等幾秒...")
    difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    range = document.querySelector('input[name="range"]:checked').value;

    const allData = await loadData("data.json");
    const chosenSeasons = range === "1" ? [1,2] : range === "2" ? [1] : [2];
    let filtered = allData.filter(d => chosenSeasons.includes(d.season));

    const classic = await loadData("classic.json");
    const classic_id = [];
    for (const outerKey in classic) {
    const season = parseInt(outerKey);
    if (chosenSeasons.includes(season)) {
        const innerDict = classic[outerKey];
            for (const key in innerDict) {
                classic_id.push(...innerDict[key]);  // 展開所有 segment_id
            } 
        }
    }
    const data_classic = allData.filter(d => classic_id.includes(d.segment_id));

    if (difficulty === "1") filtered = data_classic;

    const quotes = new Set(filtered.map(d => d.text));
    data_classic.forEach(d => { if (difficulty==="1") return; for(let i=0;i<5;i++) quotes.add(d.text); });

    const quoteArray = Array.from(quotes);
    quizData = [];

    for (let i=0;i<30;i++) quizData.push(await generateQuestion(filtered, quoteArray, i));

    if (difficulty[0] === "3") { // 魔王模式
        for (let i = 0; i < 30; i++) {
            if (i % 10 < 5) {
                quizData[i].canvas = addBlack(quizData[i].canvas);
            } else {
                quizData[i].canvas = addMosaic(quizData[i].canvas, 30);
            }
        }
    }

    idx = 0; score = 0;
    await showQuestion();
}

function optionsCount(loopIndex) {
    return loopIndex < 10 ? 3 : loopIndex < 20 ? 4 : 6;
}

async function generateQuestion(data, quotes, i) {
    data = shuffle(data)
    const choices = shuffle(quotes).slice(0, optionsCount(i));
    const answerText = choices[Math.floor(Math.random()*choices.length)];
    const choiceData = choices.map(text => data.find(d => d.text === text));
    const ansData = choiceData.find(item => item.text === answerText);
    const imageUrl = `https://mypic.0m0.uk/images/${ansData.season}/${ansData.episode}/${ansData.frame_prefer}.webp`

    const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';  // 若是跨域圖片需要加這行
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.maxWidth = '80%';
    canvas.style.height = 'auto';
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(280, 630, 720, 70);
    
    const series = ansData.season === 1 ? "MyGO!!!!!" : "Ave Mujica";

    return {
        options: choiceData.map(d => d.text),
        answer: answerText,
        canvas: canvas,
        source: `${series} 第 ${ansData.episode} 集，${Math.floor(ansData.frame_prefer/23.976/60)} 分 ${Math.floor(ansData.frame_prefer/23.976)%60} 秒處`
    };
}


function addLeftText(text) {
    const chat = document.getElementById('chatbox');
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.className = 'left-msg';
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight; // 自動滾到最底
}

function addRightText(text) {
    const chat = document.getElementById('chatbox');
    const msg = document.createElement('p');
    msg.textContent = text;
    msg.className = 'right-msg';
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight; // 自動滾到最底
}

function addImage(canvas) {
    const chat = document.getElementById('chatbox');
    const img = document.createElement('img');
    img.src = canvas.toDataURL(); // 把 canvas 轉成圖片網址

    img.style.maxWidth = `${chat.clientWidth * 0.8}px`;
    img.style.height = 'auto';  // 保持圖片比例
    img.style.display = 'block';
    img.style.margin = '5px 0';
    chat.appendChild(img);
    chat.scrollTop = chat.scrollHeight;
}

async function showQuestion() {
    const q = quizData[idx];
    chat = document.getElementById('chatbox');
    chat.innerHTML += "<br>"
    addLeftText(`第${idx+1}題：請選出圖片中正確的台詞。`)
    addImage(q.canvas);
    
    document.getElementById('question-area').style.display = 'block';
    const opts = document.getElementById('options');
    opts.innerHTML = '';
    for (const opt of q.options) {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => handleAnswer(opt); 
        opts.appendChild(btn);
        addLeftText(`${opt}`); 
    }
}

async function handleAnswer(choice) {
    addRightText(`${choice}`);
    const q = quizData[idx];
    const chat = document.getElementById('chatbox');
    if (choice === q.answer) {
        score += (idx < 20 ? 3 : 4);
        addLeftText(`✅ 答對了！  資料來源：${q.source}`);
        addLeftText(`你目前共有 ${score} 分`);
    } else {
        addLeftText(`❌ 答錯了！正確答案是：「${q.answer}」  資料來源：${q.source}`);
        addLeftText(`你目前共有 ${score} 分`);
    }
    idx++;
    if (idx < quizData.length) showQuestion();
    else finalize();
}

function finalize() {
    const chat = document.getElementById('chatbox');
    document.getElementById('question-area').style.display = 'none';
    const mode = difficulty === "1" ? "簡單模式" : difficulty === "2" ? "困難模式" : "超難模式";
    addLeftText(`🎉 測驗結束！恭喜你在 ${mode} 拿到 ${score} 分！！`);
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--) {
        const j = Math.floor(Math.random()*(i+1));
        [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
}

function addBlack(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0);

    const maxX = canvas.width / 2;
    const maxY = canvas.height / 2;
    const randX = Math.floor(Math.random() * maxX);
    const randY = Math.floor(Math.random() * maxY);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, randX, canvas.height);
    ctx.fillRect(0, 0, canvas.width, randY);
    ctx.fillRect(randX+maxX, 0, canvas.width, canvas.height);
    ctx.fillRect(0, randY+maxY, canvas.width, canvas.height);
    return canvas
}

function addMosaic(canvas, blockSize) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = Math.ceil(width / blockSize);
    tempCanvas.height = Math.ceil(height / blockSize);

    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(
        tempCanvas,
        0, 0, tempCanvas.width, tempCanvas.height,
        0, 0, width, height
    );
    return canvas
}

// 綁定啟動按鈕
document.getElementById('start-btn').onclick = startQuiz;
