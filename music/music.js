/**
 * 音乐练习模块
 * 实现音阶练习、单音辨听和多音辨听功能
 */

// 全局音乐功能命名空间
window.musicFunctions = (function() {
    // 音符频率定义（以A4=440Hz为基准）
    const NOTE_FREQUENCIES = {
        "C4": 261.63,  // C4
        "C#4": 277.18,
        "D4": 293.66,
        "D#4": 311.13,
        "E4": 329.63,
        "F4": 349.23,
        "F#4": 369.99,
        "G4": 392.00,
        "G#4": 415.30,
        "A4": 440.00,
        "A#4": 466.16,
        "B4": 493.88,
        "C5": 523.25
    };

    // 音阶定义
    const SCALES = {
        "C大调": ["C4", "D4", "E4", "F4", "G4", "A4", "B4"],
        "G大调": ["G4", "A4", "B4", "C4", "D4", "E4", "F#4"],
        "D大调": ["D4", "E4", "F#4", "G4", "A4", "B4", "C#4"],
        "A大调": ["A4", "B4", "C#4", "D4", "E4", "F#4", "G#4"],
        "E大调": ["E4", "F#4", "G#4", "A4", "B4", "C#4", "D#4"],
        "B大调": ["B4", "C#4", "D#4", "E4", "F#4", "G#4", "A#4"],
        "F#大调": ["F#4", "G#4", "A#4", "B4", "C#4", "D#4", "F4"],
        "C#大调": ["C#4", "D#4", "F4", "F#4", "G#4", "A#4", "C5"]
    };

    // 音域范围选项
    const RANGE_OPTIONS = [
        {name: "基础", notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]},
        {name: "进阶", notes: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4"]},
        {name: "扩展", notes: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"]}
    ];

    // 旋律长度选项
    const MELODY_LENGTH_OPTIONS = [3, 4, 5, 7, 9];

    // 音频上下文和音频缓存
    let audioContext = null;
    const audioBufferCache = {};
    let currentPlayingSource = null;

    // 初始化音频上下文
    function initAudioContext() {
        if (audioContext === null) {
            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                return true;
            } catch(e) {
                console.error("Web Audio API 不受支持。请使用现代浏览器。", e);
                alert("您的浏览器不支持Web Audio API，音乐功能可能无法正常工作。请使用Chrome或Firefox等现代浏览器。");
                return false;
            }
        }
        return true;
    }

    // 生成音频信号
    function generateGuitarSound(frequency, duration = 0.5) {
        if (!initAudioContext()) return;
        
        const sampleRate = audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // 吉他泛音系数
        const harmonics = [
            {harmonic: 1, amplitude: 1.0},    // 基频
            {harmonic: 2, amplitude: 0.5},    // 第一泛音
            {harmonic: 3, amplitude: 0.3},    // 第二泛音
            {harmonic: 4, amplitude: 0.2},    // 第三泛音
            {harmonic: 5, amplitude: 0.1}     // 第四泛音
        ];
        
        // 生成音频样本
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            // 叠加多个泛音
            for (const h of harmonics) {
                sample += h.amplitude * Math.sin(2 * Math.PI * frequency * h.harmonic * t);
            }
            
            // 添加淡入淡出效果
            const fadeDuration = 0.1 * sampleRate;
            if (i < fadeDuration) {
                sample *= i / fadeDuration; // 淡入
            } else if (i > frameCount - fadeDuration) {
                sample *= (frameCount - i) / fadeDuration; // 淡出
            }
            
            // 添加轻微的失真效果
            sample = Math.tanh(sample * 0.8);
            
            channelData[i] = sample;
        }
        
        return audioBuffer;
    }

    // 播放音符
    function playNote(note) {
        if (!initAudioContext()) return;
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // 停止当前正在播放的声音
        if (currentPlayingSource) {
            currentPlayingSource.stop();
        }
        
        // 获取频率
        const frequency = NOTE_FREQUENCIES[note];
        if (!frequency) {
            console.error(`未知音符: ${note}`);
            return;
        }
        
        // 检查缓存
        if (!audioBufferCache[note]) {
            audioBufferCache[note] = generateGuitarSound(frequency);
        }
        
        // 创建音频源并播放
        const source = audioContext.createBufferSource();
        source.buffer = audioBufferCache[note];
        source.connect(audioContext.destination);
        source.start();
        currentPlayingSource = source;
        
        return source;
    }

    // 播放音阶
    function playScale(scaleName) {
        if (!SCALES[scaleName]) {
            console.error(`未知音阶: ${scaleName}`);
            return;
        }
        
        // 获取用户设置
        const settings = loadUserSettings();
        const delay = settings.audio.noteDelay || 400;
        
        // 依次播放音阶中的每个音符
        const notes = SCALES[scaleName];
        notes.forEach((note, index) => {
            setTimeout(() => {
                playNote(note);
            }, index * delay);
        });
    }

    // 播放旋律
    function playMelody(melody) {
        if (!Array.isArray(melody) || melody.length === 0) {
            console.error("无效的旋律序列");
            return;
        }
        
        // 获取用户设置
        const settings = loadUserSettings();
        const delay = settings.audio.noteDelay || 400;
        
        // 依次播放旋律中的每个音符
        melody.forEach((note, index) => {
            setTimeout(() => {
                playNote(note);
            }, index * delay);
        });
    }
    
    // 停止所有声音
    function stopAllSounds() {
        if (currentPlayingSource) {
            currentPlayingSource.stop();
            currentPlayingSource = null;
        }
    }

    // 生成随机旋律
    function generateRandomMelody(rangeIndex, length) {
        const availableNotes = RANGE_OPTIONS[rangeIndex].notes;
        const melody = [];
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * availableNotes.length);
            melody.push(availableNotes[randomIndex]);
        }
        
        return melody;
    }

    // 加载用户设置
    function loadUserSettings() {
        let settings = localStorage.getItem('userSettings');
        
        if (settings) {
            try {
                return JSON.parse(settings);
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
        
        // 默认设置
        return {
            audio: { 
                volume: 0.8, 
                noteDelay: 400, 
                answerDelay: 1000, 
                autoPlayNext: true 
            },
            game: { 
                startingDifficulty: 0, 
                melodyLength: 3, 
                pointsPerCorrect: 10, 
                showHints: true 
            },
            ui: { 
                theme: 'dark',
                fontSize: 16,
                animations: true,
                highContrast: false 
            }
        };
    }

    // 加载音乐练习内容
    function loadMusicContent(moduleId) {
        // 初始化音频环境
        initAudioContext();
        
        const container = document.getElementById(`${moduleId}-container`);
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        switch(moduleId) {
            case 'scales-training':
                container.innerHTML = createScalesTrainingUI();
                initScalesTrainingListeners();
                break;
            case 'single-note':
                container.innerHTML = createSingleNoteTrainingUI();
                initSingleNoteTrainingListeners();
                break;
            case 'multi-note':
                container.innerHTML = createMultiNoteTrainingUI();
                initMultiNoteTrainingListeners();
                break;
            case 'rhythm-training':
                container.innerHTML = `
                    <h3>节奏训练</h3>
                    <div class="music-exercise">
                        <p>通过这个练习，您可以提高您的节奏感和音乐时值理解能力。</p>
                        <div class="controls">
                            <button class="play-button">播放节奏</button>
                            <button class="practice-button">开始练习</button>
                        </div>
                        <div class="rhythm-display">
                            <div class="rhythm-notation">
                                <!-- 这里将显示节奏符号 -->
                            </div>
                        </div>
                    </div>
                `;
                initDevelopingFeatureListeners();
                break;
            default:
                container.innerHTML = '<p>请选择一个练习模式</p>';
        }
    }

    // 创建音阶练习UI
    function createScalesTrainingUI() {
        const scaleNames = Object.keys(SCALES);
        
        return `
            <h3>音阶练习</h3>
            <div class="compact-container">
                <div class="left-panel">
                    <div class="scale-instructions">
                        <p>选择一个音阶，然后点击"播放"按钮来聆听</p>
                    </div>
                    <div class="scale-buttons">
                        ${scaleNames.map(name => 
                            `<div class="scale-button" data-scale="${name}">
                                <div class="scale-name">${name}</div>
                                <div class="scale-controls">
                                    <button class="play-button" data-scale="${name}">播放</button>
                                    <button class="info-button" data-scale="${name}">查看音符</button>
                                </div>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="right-panel">
                    <div class="scale-detail">
                        <h4 id="current-scale-name"></h4>
                        <div class="scale-notes" id="scale-notes"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 初始化音阶练习事件监听器
    function initScalesTrainingListeners() {
        const playButtons = document.querySelectorAll('.play-button');
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const scaleName = e.target.getAttribute('data-scale');
                playScale(scaleName);
                
                // 高亮当前选中的音阶按钮
                const scaleButtons = document.querySelectorAll('.scale-button');
                scaleButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-scale') === scaleName) {
                        btn.classList.add('active');
                    }
                });
            });
        });
        
        const infoButtons = document.querySelectorAll('.info-button');
        infoButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const scaleName = e.target.getAttribute('data-scale');
                document.getElementById('current-scale-name').textContent = scaleName;
                showScaleNotes(scaleName);
                
                // 高亮当前选中的音阶按钮
                const scaleButtons = document.querySelectorAll('.scale-button');
                scaleButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-scale') === scaleName) {
                        btn.classList.add('active');
                    }
                });
            });
        });
        
        // 默认显示第一个音阶的信息
        const scaleNames = Object.keys(SCALES);
        if (scaleNames.length > 0) {
            document.getElementById('current-scale-name').textContent = scaleNames[0];
            showScaleNotes(scaleNames[0]);
        }
    }

    // 显示音阶音符
    function showScaleNotes(scaleName) {
        const scaleNotesContainer = document.getElementById('scale-notes');
        if (!scaleNotesContainer) return;
        
        // 清空容器
        scaleNotesContainer.innerHTML = '';
        
        // 获取音阶音符
        const scaleNotes = SCALES[scaleName];
        
        // 创建音符显示
        scaleNotes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'scale-note';
            noteElement.textContent = note;
            noteElement.addEventListener('click', () => {
                playNote(note);
                
                // 高亮点击的音符
                noteElement.classList.add('active');
                setTimeout(() => {
                    noteElement.classList.remove('active');
                }, 500);
            });
            
            scaleNotesContainer.appendChild(noteElement);
        });
    }

    // 创建单音辨听训练UI
    function createSingleNoteTrainingUI() {
        const settings = loadUserSettings();
        const defaultDifficulty = settings.game.startingDifficulty || 0;
        
        return `
            <h3>单音辨听训练</h3>
            <div class="compact-container">
                <div class="left-panel">
                    <div class="game-settings">
                        <div class="difficulty-selection">
                            <label>难度:</label>
                            <select id="note-difficulty">
                                <option value="0" ${defaultDifficulty === 0 ? 'selected' : ''}>基础</option>
                                <option value="1" ${defaultDifficulty === 1 ? 'selected' : ''}>进阶</option>
                                <option value="2" ${defaultDifficulty === 2 ? 'selected' : ''}>扩展</option>
                            </select>
                        </div>
                    </div>
                    <div class="note-play-section">
                        <button id="play-single-note" class="play-button">播放音符</button>
                        <p class="note-instructions">聆听音符，然后选择正确的音符名称</p>
                    </div>
                    <div class="game-stats">
                        <div class="stats-item">
                            <span>正确:</span>
                            <span id="correct-count">0</span>
                        </div>
                        <div class="stats-item">
                            <span>错误:</span>
                            <span id="error-count">0</span>
                        </div>
                        <div class="stats-item">
                            <span>准确率:</span>
                            <span id="accuracy">0%</span>
                        </div>
                    </div>
                </div>
                <div class="right-panel">
                    <div class="notes-section">
                        <h4>选择答案</h4>
                        <div id="notes-grid" class="notes-grid">
                            <!-- 音符选项将在这里生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 初始化单音辨听训练事件监听器
    function initSingleNoteTrainingListeners() {
        // 单音辨听状态
        let currentNote = null;
        let correctCount = 0;
        let errorCount = 0;
        
        // 初始化音符按钮
        initNoteButtons();
        
        // 更新统计信息
        function updateStats() {
            document.getElementById('correct-count').textContent = correctCount;
            document.getElementById('error-count').textContent = errorCount;
            const totalAttempts = correctCount + errorCount;
            const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
            document.getElementById('accuracy').textContent = `${accuracy}%`;
        }
        
        // 初始化音符按钮
        function initNoteButtons() {
            const notesGrid = document.getElementById('notes-grid');
            if (!notesGrid) return;
            
            // 清空现有内容
            notesGrid.innerHTML = '';
            
            // 获取当前难度的可用音符
            const difficultyIndex = parseInt(document.getElementById('note-difficulty').value);
            const availableNotes = RANGE_OPTIONS[difficultyIndex].notes;
            
            // 创建音符按钮
            availableNotes.forEach(note => {
                const noteButton = document.createElement('div');
                noteButton.className = 'note-button';
                noteButton.textContent = note;
                noteButton.addEventListener('click', () => {
                    if (currentNote) {
                        // 检查是否选择了正确的音符
                        if (note === currentNote) {
                            correctCount++;
                            noteButton.classList.add('correct');
                            
                            // 获取用户设置
                            const settings = loadUserSettings();
                            
                            setTimeout(() => {
                                // 成功后自动播放下一个音符
                                noteButton.classList.remove('correct');
                                if (settings.audio.autoPlayNext) {
                                    playRandomNote();
                                }
                            }, settings.audio.answerDelay || 1000);
                        } else {
                            errorCount++;
                            noteButton.classList.add('incorrect');
                            setTimeout(() => {
                                noteButton.classList.remove('incorrect');
                            }, 1000);
                        }
                        updateStats();
                    } else {
                        // 如果没有当前音符，直接播放
                        playNote(note);
                    }
                });
                
                notesGrid.appendChild(noteButton);
            });
        }
        
        // 播放随机音符
        function playRandomNote() {
            const difficultyIndex = parseInt(document.getElementById('note-difficulty').value);
            const availableNotes = RANGE_OPTIONS[difficultyIndex].notes;
            const randomIndex = Math.floor(Math.random() * availableNotes.length);
            currentNote = availableNotes[randomIndex];
            
            // 清除所有高亮
            const noteButtons = document.querySelectorAll('.note-button');
            noteButtons.forEach(button => {
                button.classList.remove('correct');
                button.classList.remove('incorrect');
            });
            
            playNote(currentNote);
        }
        
        // 难度变化时重新生成音符按钮
        document.getElementById('note-difficulty').addEventListener('change', () => {
            initNoteButtons();
            currentNote = null;
        });
        
        // 初始化播放按钮
        document.getElementById('play-single-note').addEventListener('click', () => {
            if (currentNote) {
                playNote(currentNote);
            } else {
                playRandomNote();
            }
        });
    }

    // 创建多音辨听训练UI
    function createMultiNoteTrainingUI() {
        const settings = loadUserSettings();
        const defaultMelodyLength = settings.game.melodyLength || 3;
        const defaultDifficulty = settings.game.startingDifficulty || 0;
        
        return `
            <h3>多音辨听训练</h3>
            <div class="game-settings">
                <div class="difficulty-selection">
                    <label>旋律长度:</label>
                    <select id="melody-length">
                        ${MELODY_LENGTH_OPTIONS.map(length => 
                            `<option value="${length}" ${length === defaultMelodyLength ? 'selected' : ''}>${length}个音符</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="difficulty-selection">
                    <label>音域难度:</label>
                    <select id="melody-range">
                        <option value="0" ${defaultDifficulty === 0 ? 'selected' : ''}>基础</option>
                        <option value="1" ${defaultDifficulty === 1 ? 'selected' : ''}>进阶</option>
                        <option value="2" ${defaultDifficulty === 2 ? 'selected' : ''}>扩展</option>
                    </select>
                </div>
            </div>
            <div class="compact-container">
                <div class="left-panel">
                    <div class="melody-play-section">
                        <button id="play-melody" class="play-button">播放旋律</button>
                        <div id="melody-display" class="melody-display">
                            <!-- 旋律将在这里显示 -->
                        </div>
                    </div>
                    <div class="melody-answer-section">
                        <h4>您的答案</h4>
                        <div id="user-selection" class="user-selection">
                            <!-- 用户的选择会在这里显示 -->
                        </div>
                    </div>
                    <div id="melody-controls" class="controls">
                        <button id="check-melody">检查答案</button>
                        <button id="new-melody">新旋律</button>
                    </div>
                    <div class="game-stats">
                        <div class="stats-item">
                            <span>得分:</span>
                            <span id="melody-score">0</span>
                        </div>
                        <div class="stats-item">
                            <span>最高分:</span>
                            <span id="high-score">0</span>
                        </div>
                    </div>
                </div>
                <div class="right-panel">
                    <div class="notes-section">
                        <h4>可选音符</h4>
                        <div id="notes-selection" class="notes-grid">
                            <!-- 音符选择将在这里生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 初始化多音辨听训练事件监听器
    function initMultiNoteTrainingListeners() {
        // 旋律状态
        let currentMelody = [];
        let userSelection = [];
        let melodyScore = 0;
        let highScore = localStorage.getItem('melodyHighScore') || 0;
        
        // 显示最高分
        document.getElementById('high-score').textContent = highScore;
        
        // 获取DOM元素
        const melodyLengthSelect = document.getElementById('melody-length');
        const melodyRangeSelect = document.getElementById('melody-range');
        const playMelodyBtn = document.getElementById('play-melody');
        const checkMelodyBtn = document.getElementById('check-melody');
        const newMelodyBtn = document.getElementById('new-melody');
        const melodyDisplay = document.getElementById('melody-display');
        const userSelectionDiv = document.getElementById('user-selection');
        const notesSelectionDiv = document.getElementById('notes-selection');
        const scoreDisplay = document.getElementById('melody-score');
        
        // 生成新旋律
        function generateNewMelody() {
            const melodyLength = parseInt(melodyLengthSelect.value);
            const melodyRange = parseInt(melodyRangeSelect.value);
            
            currentMelody = generateRandomMelody(melodyRange, melodyLength);
            userSelection = [];
            
            // 更新显示
            updateMelodyDisplay();
            updateUserSelection();
            // 更新音符选择按钮
            updateNotesSelection();
        }
        
        // 播放当前旋律
        function playCurrentMelody() {
            if (currentMelody.length > 0) {
                playMelody(currentMelody);
            }
        }
        
        // 更新旋律显示
        function updateMelodyDisplay() {
            melodyDisplay.innerHTML = '';
            for (let i = 0; i < currentMelody.length; i++) {
                const noteSlot = document.createElement('div');
                noteSlot.className = 'note-slot';
                noteSlot.textContent = '?';
                melodyDisplay.appendChild(noteSlot);
            }
        }
        
        // 更新用户选择显示
        function updateUserSelection() {
            userSelectionDiv.innerHTML = '';
            
            if (userSelection.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.className = 'empty-selection';
                emptyMsg.textContent = '请选择音符来完成旋律';
                userSelectionDiv.appendChild(emptyMsg);
                return;
            }
            
            for (let i = 0; i < userSelection.length; i++) {
                const noteElement = document.createElement('div');
                noteElement.className = 'selected-note';
                noteElement.textContent = userSelection[i];
                
                // 添加删除按钮
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-note';
                deleteBtn.textContent = '×';
                deleteBtn.onclick = () => {
                    userSelection.splice(i, 1);
                    updateUserSelection();
                };
                
                noteElement.appendChild(deleteBtn);
                userSelectionDiv.appendChild(noteElement);
            }
        }
        
        // 更新音符选择按钮
        function updateNotesSelection() {
            notesSelectionDiv.innerHTML = '';
            
            // 获取当前难度的可用音符
            const melodyRange = parseInt(melodyRangeSelect.value);
            const availableNotes = RANGE_OPTIONS[melodyRange].notes;
            
            // 创建音符按钮
            availableNotes.forEach(note => {
                const noteButton = document.createElement('div');
                noteButton.className = 'note-button';
                noteButton.textContent = note;
                noteButton.addEventListener('click', () => {
                    // 播放音符
                    playNote(note);
                    
                    // 如果当前旋律已满，不再添加
                    if (userSelection.length < currentMelody.length) {
                        userSelection.push(note);
                        updateUserSelection();
                    }
                });
                
                notesSelectionDiv.appendChild(noteButton);
            });
        }
        
        // 检查答案
        function checkAnswer() {
            if (userSelection.length !== currentMelody.length) {
                alert('请选择所有音符！');
                return;
            }
            
            // 计算正确数量
            let correctCount = 0;
            for (let i = 0; i < currentMelody.length; i++) {
                if (userSelection[i] === currentMelody[i]) {
                    correctCount++;
                }
            }
            
            // 获取设置
            const settings = loadUserSettings();
            const pointsPerCorrect = settings.game.pointsPerCorrect || 10;
            
            // 计算分数
            const newScore = correctCount * pointsPerCorrect;
            melodyScore += newScore;
            
            // 更新最高分
            if (melodyScore > highScore) {
                highScore = melodyScore;
                localStorage.setItem('melodyHighScore', highScore);
                document.getElementById('high-score').textContent = highScore;
            }
            
            // 更新分数显示
            scoreDisplay.textContent = melodyScore;
            
            // 显示正确答案
            showAnswer();
            
            // 显示结果信息
            if (correctCount === currentMelody.length) {
                alert(`太棒了! 全部正确! 得分: ${newScore}`);
                
                // 答对后自动生成并播放新旋律
                setTimeout(() => {
                    generateNewMelody();
                    setTimeout(() => {
                        playCurrentMelody();
                    }, 500); // 等待半秒后播放，让用户有时间准备
                }, settings.audio.answerDelay || 1000);
            } else {
                alert(`回答正确: ${correctCount}/${currentMelody.length}. 得分: ${newScore}`);
                // 答错，分数归零
                if (correctCount < currentMelody.length) {
                    melodyScore = 0;
                    scoreDisplay.textContent = melodyScore;
                }
            }
        }
        
        // 显示正确答案
        function showAnswer() {
            melodyDisplay.innerHTML = '';
            for (let i = 0; i < currentMelody.length; i++) {
                const noteElement = document.createElement('div');
                noteElement.className = 'note-slot correct';
                noteElement.textContent = currentMelody[i];
                
                if (userSelection[i] === currentMelody[i]) {
                    noteElement.classList.add('user-correct');
                }
                
                melodyDisplay.appendChild(noteElement);
            }
        }
        
        // 事件监听
        melodyRangeSelect.addEventListener('change', () => {
            updateNotesSelection();
            // 自动生成新旋律
            generateNewMelody();
        });
        
        // 添加旋律长度变化的事件监听，自动生成新旋律
        melodyLengthSelect.addEventListener('change', () => {
            generateNewMelody();
        });
        
        // 添加事件监听
        playMelodyBtn.addEventListener('click', playCurrentMelody);
        checkMelodyBtn.addEventListener('click', checkAnswer);
        newMelodyBtn.addEventListener('click', generateNewMelody);
        
        // 初始生成一个旋律
        generateNewMelody();
    }
    
    // 为尚在开发的功能添加事件监听器
    function initDevelopingFeatureListeners() {
        const buttons = document.querySelectorAll('.music-exercise button');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                alert('此功能正在开发中，敬请期待！');
            });
        });
    }

    // 初始化音乐应用
    document.addEventListener('DOMContentLoaded', function() {
        // 初始化音频上下文
        initAudioContext();
        
        // 为音乐练习选项卡添加事件监听器
        const musicCards = document.querySelectorAll('.music-card');
        const musicContainers = document.querySelectorAll('.music-container');
        
        musicCards.forEach(card => {
            card.addEventListener('click', function() {
                const id = this.getAttribute('id');
                
                // 移除所有卡片的活跃状态
                musicCards.forEach(c => c.classList.remove('active'));
                
                // 隐藏所有音乐容器
                musicContainers.forEach(container => container.style.display = 'none');
                
                // 添加活跃状态到当前卡片
                this.classList.add('active');
                
                // 显示对应的音乐容器
                if (id) {
                    const targetContainer = document.getElementById(`${id}-container`);
                    if (targetContainer) {
                        targetContainer.style.display = 'block';
                        // 加载相应的音乐练习内容
                        loadMusicContent(id);
                    }
                }
            });
        });
    });

    // 返回公共API
    return {
        // 暴露的变量
        scales: SCALES,
        rangeOptions: RANGE_OPTIONS,
        
        // 暴露的方法
        playNote: playNote,
        playScale: playScale,
        playMelody: playMelody,
        stopAllSounds: stopAllSounds,
        generateRandomMelody: generateRandomMelody,
        loadMusicContent: loadMusicContent
    };
})(); 