let historyAll = [];
let historyWeekly = [];

// Acceder al historial
async function loadHistory() {
    const result = await chrome.storage.local.get(['historyAll', 'historyWeekly']);

    if ( result.historyAll){
        historyAll = result.historyAll;
    }
    if (result.historyWeekly){
        historyWeekly = result.historyWeekly;
    }

    renderHistory();
    
}

// Funcion para crear un item del historial
function createHistoryItem(domain, timeSpent){
    const item = document.createElement('div');
    item.className = 'history-item';
    
    item.innerHTML = `
        <div class="history-item-left">
          <p class="domain-text">${domain}</p>
        </div>
        <div class="history-item-right">
          <i class="fa-regular fa-clock"></i>
          <span>${formatTime(timeSpent)}</span>
        </div>
    `;
    
    return item;
}

// Funcion para renderizar todo el historial
function renderHistory(){
    const container = document.getElementById('historyList');

    // Limpiar items
    container.innerHTML = '';

    historyAll.forEach(entry => {
        const item = createHistoryItem(entry.web, entry.time);
        container.appendChild(item)
    });
}

// Funcion: convierte segundos a formato legible (ej: "3h 25m 10s", "45m 30s", "15s")
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let timeString = '';

    if (hours > 0){
        timeString += `${hours}h `;
    }
    if (minutes > 0){
        timeString += `${minutes}m `;
    }

    timeString += `${seconds}s`;

    return timeString.trim();
}
// Cargar historial
loadHistory();