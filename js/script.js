document.addEventListener('DOMContentLoaded', () => {
    console.log("PoliQuest: Script Iniciado (v5 - Fix Inicialização).");

    // --- 1. FUNÇÃO AUXILIAR (DEFINIDA PRIMEIRO PARA EVITAR ERROS) ---
    const getEl = (id) => document.getElementById(id);

    // --- 2. VERIFICAÇÃO DE DADOS ---
    if (!window.QUIZ_DATA) {
        console.error("ERRO CRÍTICO: window.QUIZ_DATA não encontrado. Rode 'node builder.js'.");
        return;
    }
    const { questions, ui, definitions } = window.QUIZ_DATA;

    // --- 3. ACESSIBILIDADE (Agora seguro de chamar) ---
    setupAccessibility();

    // --- 4. ESTADO ---
    let currentQ = 0;
    let answers = new Array(questions.length).fill(0);
    let scores = { economy: 0, society: 0, foreign: 0, rules: 0, hierarchy: 0 };
    let maxScores = { economy: 0, society: 0, foreign: 0, rules: 0, hierarchy: 0 };

    // --- 5. SELEÇÃO DE ELEMENTOS ---
    const startBtn = getEl('start-quiz-btn');
    const introSec = getEl('intro-section');
    const questSec = getEl('question-container');
    const resultSec = getEl('results-section');
    
    const slider = getEl('answer-slider');
    const sVal = getEl('slider-value');
    const qText = getEl('question-text');
    const qEx = getEl('question-example');
    const qCount = getEl('question-counter');
    const qSelect = getEl('question-select');
    
    const prevBtn = getEl('prev-question-btn');
    const nextBtn = getEl('next-question-btn');
    const restartBtn = getEl('restart-btn');

    // Elementos do Relatório
    const btnGenReport = getEl('btn-generate-report');
    const divReportContent = getEl('report-content');
    const txtReport = getEl('report-textarea');
    const btnCopy = getEl('btn-copy-report');
    const btnDownload = getEl('btn-download-report');
    const feedbackMsg = getEl('copy-feedback');

    // --- 6. FUNÇÕES LÓGICAS ---

    function calcMaxScores() {
        maxScores = { economy: 0, society: 0, foreign: 0, rules: 0, hierarchy: 0 };
        questions.forEach(q => {
            for (let axis in q.effects) {
                if (maxScores.hasOwnProperty(axis)) {
                    maxScores[axis] += Math.abs(q.effects[axis]) * 10;
                }
            }
        });
    }

    function populateSelect() {
        if (!qSelect) return;
        qSelect.innerHTML = '';
        questions.forEach((q, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            const preview = q.text.length > 40 ? q.text.substring(0, 40) + '...' : q.text;
            opt.textContent = `${idx + 1}. ${preview}`;
            qSelect.appendChild(opt);
        });
    }

    function showQuestion() {
        const q = questions[currentQ];
        if (qText) qText.textContent = q.text;
        
        if (qEx) {
            if (q.example) {
                qEx.textContent = q.example;
                qEx.style.display = "block";
            } else {
                qEx.textContent = "";
                qEx.style.display = "none";
            }
        }

        if (qCount) qCount.textContent = `${currentQ + 1} / ${questions.length}`;
        if (qSelect) qSelect.value = currentQ;
        
        if (slider) slider.value = answers[currentQ];
        if (sVal) sVal.textContent = slider.value;
        
        if (prevBtn) prevBtn.disabled = currentQ === 0;
        if (nextBtn) nextBtn.textContent = currentQ === questions.length - 1 ? ui.btn_finish : ui.btn_next;
    }

    function calculateScores() {
        scores = { economy: 0, society: 0, foreign: 0, rules: 0, hierarchy: 0 };
        answers.forEach((ans, idx) => {
            const eff = questions[idx].effects;
            for (let axis in eff) {
                if (scores.hasOwnProperty(axis)) {
                    scores[axis] += ans * eff[axis];
                }
            }
        });
    }

    function renderGraphs() {
        const axes = ['economy', 'society', 'foreign', 'rules', 'hierarchy'];
        axes.forEach(axis => {
            const max = maxScores[axis] || 1; 
            const raw = scores[axis];
            let pct = ((raw / max) + 1) / 2 * 100;
            pct = Math.max(0, Math.min(100, pct));
            
            const point = getEl(`${axis}-point`);
            const label = getEl(`${axis}-point-value`);
            if (point && label) {
                point.style.top = `${pct}%`;
                label.textContent = `${Math.round(pct)}%`;
            }
        });
    }

    // --- 7. GERAÇÃO DE RELATÓRIO ---
    function generateReportText() {
        const date = new Date().toISOString().split('T')[0];
        let text = `POLIQUEST REPORT - ${date}\n`;
        text += `Lang: ${document.documentElement.lang}\n`;
        text += `--------------------------------\n`;
        
        text += `SCORES:\n`;
        const axes = ['economy', 'society', 'foreign', 'rules', 'hierarchy'];
        axes.forEach(axis => {
            const max = maxScores[axis] || 1;
            const raw = scores[axis];
            let pct = ((raw / max) + 1) / 2 * 100;
            pct = Math.round(Math.max(0, Math.min(100, pct)));
            text += `${axis.toUpperCase()}: ${pct}%\n`;
        });

        text += `--------------------------------\n`;
        text += `RAW ANSWERS:\n`;
        answers.forEach((ans, idx) => {
            text += `Q${idx + 1}: ${ans}\n`;
        });
        
        return text;
    }

    // --- 8. GERENCIADOR DE EVENTOS (DELEGAÇÃO) ---
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.id;

        // Botão Gerar Relatório
        if (id === 'btn-generate-report') {
            const reportStr = generateReportText();
            if (txtReport && divReportContent) {
                txtReport.value = reportStr;
                divReportContent.classList.remove('hidden');
                divReportContent.style.display = 'block';
                target.style.display = 'none';
            }
        }

        // Botão Copiar
        if (id === 'btn-copy-report') {
            if (txtReport) {
                txtReport.select();
                txtReport.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(txtReport.value).then(() => {
                    if (feedbackMsg) feedbackMsg.textContent = ui.msg_copied || "Copiado!";
                    setTimeout(() => { if (feedbackMsg) feedbackMsg.textContent = ''; }, 3000);
                });
            }
        }

        // Botão Baixar
        if (id === 'btn-download-report') {
            if (txtReport && txtReport.value) {
                const blob = new Blob([txtReport.value], { type: 'text/plain' });
                const anchor = document.createElement('a');
                anchor.download = 'poliquest_results.txt';
                anchor.href = window.URL.createObjectURL(blob);
                anchor.style.display = 'none';
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
            }
        }

        // Botões do Modal (Info)
        if (target.classList.contains('info-btn')) {
            const key = target.getAttribute('data-info');
            const modal = getEl('info-modal');
            const modalTitle = getEl('modal-title');
            const modalText = getEl('modal-text');
            
            if (definitions && definitions[key] && modal) {
                if(modalTitle) modalTitle.textContent = definitions[key].title;
                if(modalText) modalText.textContent = definitions[key].text;
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        // Fechar Modal
        if (id === 'modal-close-btn' || id === 'info-modal') {
            const modal = getEl('info-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }
    });

    // --- 9. EVENTOS DE NAVEGAÇÃO ---

    if (startBtn) startBtn.onclick = () => {
        calcMaxScores();
        populateSelect();
        if(introSec) introSec.classList.add('hidden');
        if(questSec) questSec.classList.remove('hidden');
        showQuestion();
    };

    if (slider) slider.oninput = () => { if (sVal) sVal.textContent = slider.value; };

    if (qSelect) qSelect.onchange = (e) => {
        answers[currentQ] = parseInt(slider.value);
        currentQ = parseInt(e.target.value);
        showQuestion();
    };

    if (nextBtn) nextBtn.onclick = () => {
        answers[currentQ] = parseInt(slider.value);
        if (currentQ < questions.length - 1) {
            currentQ++;
            showQuestion();
        } else {
            calculateScores();
            if(questSec) questSec.classList.add('hidden');
            if(resultSec) resultSec.classList.remove('hidden');
            setTimeout(renderGraphs, 100);
        }
    };

    if (prevBtn) prevBtn.onclick = () => {
        if (currentQ > 0) {
            answers[currentQ] = parseInt(slider.value);
            currentQ--;
            showQuestion();
        }
    };

    if (restartBtn) restartBtn.onclick = () => {
        currentQ = 0;
        answers.fill(0);
        if(resultSec) resultSec.classList.add('hidden');
        if(introSec) introSec.classList.remove('hidden');
        
        // Reset Relatório
        if(btnGenReport) btnGenReport.style.display = 'inline-block';
        if(divReportContent) {
            divReportContent.classList.add('hidden');
            divReportContent.style.display = 'none';
        }
        
        window.scrollTo(0, 0);
    };

    // --- 10. ACESSIBILIDADE ---
    function setupAccessibility() {
        const themeBtn = getEl('theme-toggle');
        const iconSun = getEl('icon-sun');
        const iconMoon = getEl('icon-moon');
        const incBtn = getEl('increase-font');
        const decBtn = getEl('decrease-font');
        const html = document.documentElement;

        function applyTheme(isDark) {
            if (isDark) {
                html.classList.add('dark');
                if(iconSun) iconSun.classList.add('hidden');
                if(iconMoon) iconMoon.classList.remove('hidden');
            } else {
                html.classList.remove('dark');
                if(iconSun) iconSun.classList.remove('hidden');
                if(iconMoon) iconMoon.classList.add('hidden');
            }
        }
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(savedTheme ? savedTheme === 'dark' : systemDark);

        if(themeBtn) themeBtn.onclick = () => {
            const isDarkNow = html.classList.contains('dark');
            applyTheme(!isDarkNow);
            localStorage.setItem('theme', !isDarkNow ? 'dark' : 'light');
        };

        let currentSize = parseFloat(localStorage.getItem('fontSize')) || 16;
        html.style.fontSize = `${currentSize}px`;

        if(incBtn) incBtn.onclick = () => {
            if(currentSize < 24) { currentSize++; html.style.fontSize = `${currentSize}px`; localStorage.setItem('fontSize', currentSize); }
        };
        if(decBtn) decBtn.onclick = () => {
            if(currentSize > 12) { currentSize--; html.style.fontSize = `${currentSize}px`; localStorage.setItem('fontSize', currentSize); }
        };
    }
});