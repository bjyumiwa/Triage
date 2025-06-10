// グローバル変数
let patients = []; // 患者データを保存する配列
let currentTriageResult = null; // 現在のトリアージ結果
let canWalk = null; // 歩行可能かどうか
let hasConsciousness = null; // 意識があるかどうか

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // LocalStorageからデータを読み込む
    loadPatients();
    
    // トリアージ判定イベントリスナーの設定
    setupTriageAssessment();
    
    // フォーム操作イベントリスナーの設定
    setupFormListeners();
    
    // タブと検索のイベントリスナーの設定
    setupTabsAndSearch();
    
    // オフラインステータスの監視
    setupOfflineStatus();
});

// LocalStorageから患者データを読み込む
function loadPatients() {
    const storedPatients = localStorage.getItem('triagedPatients');
    if (storedPatients) {
        patients = JSON.parse(storedPatients);
        renderPatientsList();
    }
}

// LocalStorageに患者データを保存
function savePatients() {
    localStorage.setItem('triagedPatients', JSON.stringify(patients));
}

// トリアージ判定フローの設定
function setupTriageAssessment() {
    // 歩行可能かどうかのボタン
    document.getElementById('walkYes').addEventListener('click', () => {
        canWalk = true;
        document.getElementById('consciousnessQuestion').classList.remove('hidden');
        highlightSelectedButton('walkYes', 'walkNo');
    });
    
    document.getElementById('walkNo').addEventListener('click', () => {
        canWalk = false;
        document.getElementById('consciousnessQuestion').classList.remove('hidden');
        highlightSelectedButton('walkNo', 'walkYes');
    });
    
    // 意識があるかどうかのボタン
    document.getElementById('consciousYes').addEventListener('click', () => {
        hasConsciousness = true;
        showTriageResult();
        highlightSelectedButton('consciousYes', 'consciousNo');
    });
    
    document.getElementById('consciousNo').addEventListener('click', () => {
        hasConsciousness = false;
        showTriageResult();
        highlightSelectedButton('consciousNo', 'consciousYes');
    });
    
    // 患者情報入力フォームへ進むボタン
    document.getElementById('continueToForm').addEventListener('click', () => {
        switchStep('step-triage', 'step-form');
        updateIntelligentInstructions();
    });
}

// 選択されたボタンをハイライト
function highlightSelectedButton(selectedId, otherId) {
    const selectedButton = document.getElementById(selectedId);
    const otherButton = document.getElementById(otherId);
    
    selectedButton.classList.add('selected');
    otherButton.classList.remove('selected');
}

// トリアージ結果の表示
function showTriageResult() {
    currentTriageResult = performTriage(canWalk, hasConsciousness);
    
    const resultDiv = document.getElementById('triageResult');
    const resultColor = document.getElementById('resultColor');
    const resultText = document.getElementById('resultText');
    const resultInstructions = document.getElementById('resultInstructions');
    
    // 結果エリアを表示
    resultDiv.classList.remove('hidden');
    
    // トリアージ色に基づいたスタイル適用
    resultColor.className = 'result-color';
    resultColor.classList.add(`${currentTriageResult.color}-result`);
    
    // トリアージ結果テキスト
    resultText.textContent = currentTriageResult.text;
    
    // 指示内容
    resultInstructions.textContent = currentTriageResult.instruction;
}

// トリアージ判定ロジック
function performTriage(canWalk, hasConsciousness) {
    // 歩行あり、意識あり => 緑
    if (canWalk === true && hasConsciousness === true) {
        return {
            color: 'green',
            text: '緑（軽症）',
            instruction: '軽処置後、避難所へ誘導してください'
        };
    } 
    // 歩行なし、意識なし => 赤 (修正点1: 最優先治療群へ)
    else if (canWalk === false && hasConsciousness === false) {
        return {
            color: 'red',
            text: '赤（最優先治療群）',
            instruction: '緊急！医師を呼び、救護所への搬送を優先してください'
        };
    } 
    // 歩行なし、意識あり => 黄 (修正点2: 準緊急治療群へ)
    // 歩行あり、意識なし => 黄 (ここは元々黄色で問題なし)
    else if ((canWalk === false && hasConsciousness === true) || 
               (canWalk === true && hasConsciousness === false)) {
        return {
            color: 'yellow',
            text: '黄（準緊急治療群）',
            instruction: '継続的に意識状態を確認し、迅速に救護所に搬送してください'
        };
    } 
    // その他のケース（通常はありえないが、念のため）
    else {
        return {
            color: 'gray',
            text: '判定不能',
            instruction: '医療従事者に相談してください'
        };
    }
}
// フォーム操作イベントリスナーの設定
function setupFormListeners() {
    // トリアージ判定に戻るボタン
    document.getElementById('backToTriage').addEventListener('click', () => {
        switchStep('step-form', 'step-triage');
    });
    
    // 患者情報を記録するボタン
    document.getElementById('savePatient').addEventListener('click', savePatientData);
    
    // 新規患者登録ボタン
    document.getElementById('newPatient').addEventListener('click', () => {
        resetForm();
        resetTriageAssessment();
        switchStep('step-complete', 'step-triage');
    });
    
    // 患者リスト表示ボタン
    document.getElementById('viewPatientsList').addEventListener('click', () => {
        switchStep('step-complete', 'step-list');
        renderPatientsList();
    });
    
    // 患者リストから新規登録に戻るボタン
    document.getElementById('backToNewPatient').addEventListener('click', () => {
        resetForm();
        resetTriageAssessment();
        switchStep('step-list', 'step-triage');
    });
    
    // 負傷部位のチェックボックスが変更されたとき
    const injuryCheckboxes = document.querySelectorAll('input[name="injuryPart"]');
    injuryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateIntelligentInstructions);
    });
    
    // 出血状況が変更されたとき
    document.getElementById('bleedingStatus').addEventListener('change', updateIntelligentInstructions);
}

// 患者データの保存
function savePatientData() {
    const patientName = document.getElementById('patientName').value;
    
    // 必須項目のバリデーション
    if (!patientName.trim()) {
        alert('患者名は必須項目です');
        return;
    }
    
    // チェックされた負傷部位を取得
    const injuryParts = [];
    document.querySelectorAll('input[name="injuryPart"]:checked').forEach(checkbox => {
        injuryParts.push(checkbox.value);
    });
    
    // 新しい患者レコードを作成
    const newPatient = {
        id: Date.now(),
        name: patientName,
        gender: document.getElementById('patientGender').value,
        age: document.getElementById('patientAge').value,
        floor: document.getElementById('locationFloor').value,
        locationType: document.getElementById('locationType').value,
        reporterName: document.getElementById('reporterName').value,
        injuryParts: injuryParts,
        bleeding: document.getElementById('bleedingStatus').value,
        condition: document.getElementById('patientCondition').value,
        triage: currentTriageResult.color,
        triageText: currentTriageResult.text,
        instruction: document.getElementById('intelligentInstructions').textContent,
        canWalk: canWalk,
        hasConsciousness: hasConsciousness,
        timestamp: new Date().toISOString()
    };
    
    // 配列の先頭に追加（新しい順で表示するため）
    patients.unshift(newPatient);
    
    // LocalStorageに保存
    savePatients();
    
    // 完了画面に進む
    switchStep('step-form', 'step-complete');
}

// インテリジェント指示システムの更新
function updateIntelligentInstructions() {
    if (!currentTriageResult) return;
    
    const bleeding = document.getElementById('bleedingStatus').value;
    const injuryParts = Array.from(document.querySelectorAll('input[name="injuryPart"]:checked')).map(cb => cb.value);
    
    let instruction = '';
    
    // 赤タグ（最優先）
    if (currentTriageResult.color === 'red') {
        if (bleeding === '重度') {
            instruction = "🚨 緊急！担架と止血用具を準備。医師を呼んでください。";
        } else if (injuryParts.includes('頭部')) {
            instruction = "🚨 頸椎固定用具と担架を準備。慎重に搬送してください。";
        } else if (injuryParts.includes('胸部')) {
            instruction = "🚨 酸素吸入器と担架を準備。呼吸状態を継続監視してください。";
        } else {
            instruction = "🚨 担架を準備し、医師の指示を仰いでください。";
        }
    }
    // 黄タグ（準緊急）
    else if (currentTriageResult.color === 'yellow') {
        if (!hasConsciousness && (bleeding === 'なし' || bleeding === '軽度')) {
            instruction = "⚠️ 担架を準備。意識レベルを継続確認してください。";
        } else if (canWalk && (bleeding === '中度' || bleeding === '重度')) {
            instruction = "⚠️ 止血処置を実施。座位で待機させてください。";
        } else {
            instruction = "⚠️ バイタルサインを継続的に確認してください。";
        }
    }
    // 緑タグ（軽症）
    else if (currentTriageResult.color === 'green') {
        instruction = "✅ 軽処置後、避難所へ誘導してください。";
    }
    
    document.getElementById('intelligentInstructions').textContent = instruction;
}

// フォームのリセット
function resetForm() {
    document.getElementById('patientName').value = '';
    document.getElementById('patientGender').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('locationFloor').value = '';
    document.getElementById('locationType').value = '';
    document.getElementById('reporterName').value = '';
    document.getElementById('bleedingStatus').value = '';
    document.getElementById('patientCondition').value = '';
    
    // チェックボックスのリセット
    document.querySelectorAll('input[name="injuryPart"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// トリアージ判定のリセット
function resetTriageAssessment() {
    canWalk = null;
    hasConsciousness = null;
    currentTriageResult = null;
    
    // UI要素のリセット
    document.getElementById('consciousnessQuestion').classList.add('hidden');
    document.getElementById('triageResult').classList.add('hidden');
    
    // 選択状態のリセット
    document.getElementById('walkYes').classList.remove('selected');
    document.getElementById('walkNo').classList.remove('selected');
    document.getElementById('consciousYes').classList.remove('selected');
    document.getElementById('consciousNo').classList.remove('selected');
}

// ステップの切り替え
function switchStep(fromStepId, toStepId) {
    document.getElementById(fromStepId).classList.remove('active');
    document.getElementById(toStepId).classList.add('active');
    
    // 画面の先頭にスクロール
    window.scrollTo(0, 0);
}

// タブと検索のイベントリスナーの設定
function setupTabsAndSearch() {
    // 検索機能
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        const activeTab = document.querySelector('.tab-btn.active');
        const triage = activeTab.dataset.triage;
        const searchTerm = searchInput.value;
        
        const filtered = filterPatients(triage, searchTerm);
        renderPatientsList(filtered);
    });
    
    // 検索クリアボタン
    document.getElementById('clearSearch').addEventListener('click', () => {
        searchInput.value = '';
        const activeTab = document.querySelector('.tab-btn.active');
        const triage = activeTab.dataset.triage;
        
        const filtered = filterPatients(triage, '');
        renderPatientsList(filtered);
    });
    
    // タブ切り替え
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // アクティブクラスを切り替え
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 選択されたトリアージでフィルタリング
            const triage = button.dataset.triage;
            const searchTerm = searchInput.value;
            
            const filtered = filterPatients(triage, searchTerm);
            renderPatientsList(filtered);
        });
    });
}

// 患者リストをフィルタリング
function filterPatients(triage, searchTerm) {
    let filtered = patients;
    
    // トリアージでフィルタリング
    if (triage !== 'all') {
        filtered = filtered.filter(patient => patient.triage === triage);
    }
    
    // 検索語でフィルタリング
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(patient => 
            (patient.name && patient.name.toLowerCase().includes(term)) || 
            (patient.gender && patient.gender.toLowerCase().includes(term)) ||
            (patient.age && patient.age.toString().includes(term)) ||
            (patient.floor && patient.floor.toLowerCase().includes(term)) ||
            (patient.locationType && patient.locationType.toLowerCase().includes(term)) ||
            (patient.reporterName && patient.reporterName.toLowerCase().includes(term)) ||
            (patient.condition && patient.condition.toLowerCase().includes(term))
        );
    }
    
    return filtered;
}

// 患者リストを表示
function renderPatientsList(filteredPatients = null) {
    const patientsToRender = filteredPatients || patients;
    const patientsList = document.querySelector('.patients-list');
    patientsList.innerHTML = '';

    if (patientsToRender.length === 0) {
        patientsList.innerHTML = '<p class="no-data">記録された患者はいません</p>';
        return;
    }

    patientsToRender.forEach(patient => {
        const patientCard = document.createElement('div');
        patientCard.className = `patient-card ${patient.triage}-card`;
        
        // 場所情報を組み立て
        const locationInfo = [];
        if (patient.floor) locationInfo.push(patient.floor);
        if (patient.locationType) locationInfo.push(patient.locationType);
        const locationText = locationInfo.length > 0 ? locationInfo.join(' ') : '場所未記入';
        
        // 年齢・性別情報を組み立て
        let demographicInfo = [];
        if (patient.age) demographicInfo.push(`${patient.age}歳`);
        if (patient.gender) demographicInfo.push(patient.gender);
        const demographicText = demographicInfo.length > 0 ? demographicInfo.join(' / ') : '-';
        
        // 負傷部位情報
        const injuryPartsText = patient.injuryParts && patient.injuryParts.length > 0 
            ? `負傷部位: ${patient.injuryParts.join(', ')}` 
            : '';
        
        // 出血状況
        const bleedingText = patient.bleeding 
            ? `出血: ${patient.bleeding}` 
            : '';
        
        patientCard.innerHTML = `
            <div class="patient-name">${patient.name || '名前なし'}</div>
            <div class="patient-info">${demographicText} | トリアージ: ${patient.triageText || getTriageLabel(patient.triage)}</div>
            <div class="patient-location">場所: ${locationText}</div>
            ${injuryPartsText ? `<div class="patient-injuries">${injuryPartsText}</div>` : ''}
            ${bleedingText ? `<div class="patient-bleeding">${bleedingText}</div>` : ''}
            ${patient.condition ? `<div class="patient-condition">${patient.condition}</div>` : ''}
            ${patient.reporterName ? `<div class="patient-reporter">報告者: ${patient.reporterName}</div>` : ''}
            <div class="timestamp">${formatDate(patient.timestamp)}</div>
        `;
        
        patientsList.appendChild(patientCard);
    });
}

// トリアージのラベルを取得
function getTriageLabel(triage) {
    switch(triage) {
        case 'red': return '赤（最優先治療群）';
        case 'yellow': return '黄（準緊急治療群）';
        case 'green': return '緑（軽症群）';
        default: return triage;
    }
}

// 日付をフォーマット
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

// ゼロパディング
function padZero(num) {
    return num.toString().padStart(2, '0');
}

// オフラインステータスの監視
function setupOfflineStatus() {
    const offlineStatus = document.getElementById('offlineStatus');
    
    function updateOnlineStatus() {
        if (navigator.onLine) {
            offlineStatus.classList.add('hidden');
        } else {
            offlineStatus.classList.remove('hidden');
        }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // 初期状態の設定
    updateOnlineStatus();
}
