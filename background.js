// background.js

// console.log("El cerebro (background.js) ha empezado a funcionar."); // debug

// Al iniciar, cargar datos guardados
chrome.runtime.onStartup.addListener(async () => {
    await loadHistoryFromStorage();
});

chrome.runtime.onInstalled.addListener(async () => {
    await loadHistoryFromStorage();
});

let counterInterval = null;
let elapsedTime = 0; 
let currentDomain = '';
let historyAll = [];
let historyWeekly = [];

// Cargar historial del almacenamiento
async function loadHistoryFromStorage() {
    // Accedemos a los datos desde el almacenamiento local
    const result = await chrome.storage.local.get(['historyAll', 'historyWeekly']);

    if (result.historyAll){
        historyAll = result.historyAll;
    }
    if (result.historyWeekly){
        historyWeekly = result.historyWeekly;
    }
    // console.log("Historial cargado desde storage:", historyAll); // debug
}

// Guardar historial en el almacenamiento
async function saveHistoryToStorage() {
    await chrome.storage.local.set({
        historyAll: historyAll,
        historyWeekly: historyWeekly

    });
    // console.log("Historial guardado en storage"); // debug
}

// Funcion general para guardar el tiempo de navegacion en los historiales
async function saveToHistory(domain, timeSpent) {
    // Siempre cargar el historial mas reciente antes de modificar
    const result = await chrome.storage.local.get(['historyAll', 'historyWeekly']);
    historyAll = result.historyAll || [];
    historyWeekly = result.historyWeekly || [];
    // Buscar si ya existe el dominio en el historyAll
    const existingEntry = historyAll.find(
        entry => entry.web === domain
    );

    if (existingEntry) {
        // Si existe, sumar el tiempo
        existingEntry.time += timeSpent;
    } else {
        // Si no existe, crear nueva entrada
        historyAll.push({
            web: domain,
            time: timeSpent
        });
    }

    // Guardar en historial semanal
    await saveToWeeklyHistory(domain, timeSpent);

    // Guardar en storage despues de actualizar
    await saveHistoryToStorage();
}
// Guardar el tiempo de navegacion en el historial semanal (HistoryWeekly)
// TODO: En produccion esta funcionalidad estara oculta al usuario pero seguira registrando datos
async function saveToWeeklyHistory(domain, timeSpent) {
    // El dia de hoy
    const today = new Date().toDateString();

    // Siempre cargar el historial semanal mas reciente antes de modificar
    const result = await chrome.storage.local.get(['historyWeekly']);
    historyWeekly = result.historyWeekly || [];

    // Buscar si ya existe una entrada para este dominio y esta fecha
    const existingEntry = historyWeekly.find(
        entry => entry.web === domain && entry.date === today
    );

    if (existingEntry){
        // Si existe, sumar el tiempo
        existingEntry.time += timeSpent;
    } else {
        historyWeekly.push({
            web: domain,
            time: timeSpent,
            date: today,
            timestamp: Date.now()
            // El timestamp es la fecha de hoy en milisegundos. Una vez que se registra el historial de la web, el timestamp siempre va a estar en la misma fecha. Hasta que se elimine el historial (ahi se establece de nuevo)
        });
    }

    // Limpiar entradas mayores a 7 dias
    cleanOldEntries();

    
}

// Funcion que filtra historial
function cleanOldEntries() {
    // Cantidad de milisegundos en 7 dias
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Filtra el historial, dejando solo las entradas recientes
    // Mantiene solo si el timestamp es mayor o igual a hace 7 dias, si no, la borra.
    historyWeekly = historyWeekly.filter(
        entry => entry.timestamp >= sevenDaysAgo
    );
}

// Funcion: convierte segundos a formato legible (ej: "3h 25m 10s", "45m 30s", "15s")
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let timeString = '';

    if (hours > 0){
        timeString += `${hours}h`;
    }
    if (minutes > 0){
        timeString += `${minutes}m`;
    }

    timeString += `${seconds}s`;

    return timeString.trim();
}

// Detiene el contador actual, guarda el tiempo y reinicia uno nuevo
async function switchTab(){
    
    // Si hay contador activo, detener el Interval
    if (counterInterval) {

        // Guardar el tiempo de la pestaña anterior en el historial
        if (currentDomain && elapsedTime > 0){
            await saveToHistory(currentDomain, elapsedTime);
            // console.log("historyAll actualizado:", historyAll); // debug
        }
        clearInterval(counterInterval);

    }

    elapsedTime = 0;

    counterInterval = setInterval(() =>{
        elapsedTime++;
        // console.log(`Tiempo en esta pestaña: ${formatTime(elapsedTime)}`); // debug
    
    }, 1000); // 1000 ms = 1 segundo
}

// Detecta cuando el usuario cambia a una pestaña diferente
chrome.tabs.onActivated.addListener(activeInfo => {

    const tabId = activeInfo.tabId;

    // Ahora que tenemos el ID de la pestaña, podemos obtener toda su información.
    chrome.tabs.get(tabId, (tab) => {
        
        if (tab && tab.url) {
            try {
                const url = new URL(tab.url);
                const hostname = url.hostname;
                const domain = hostname.replace('www.', '');
                
                switchTab();
                // console.log("Pestaña cambiada a:", domain); // debug
                currentDomain = domain;
                

            } catch (error){
                // Maneja URLs internas del navegador (chrome://, edge://, etc.)
                switchTab();
                currentDomain = tab.url;
                // console.log("Pestaña cambiada a:", tab.url); // debug
                
            }
        }
    });
});

// Detecta cuando la URL cambia en la misma pestaña (navegacion interna)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>{

    // Solo actuar cuando la URL ha cambiado completamente
    if (changeInfo.status === 'complete' && tab.active && tab.url){
        try {
            const url = new URL(tab.url);
            const hostname = url.hostname;
            const domain = hostname.replace('www.', '');

            // Solo cambiar si es un dominio diferente
            if (currentDomain !== domain) {
                switchTab();
                currentDomain = domain;
                // console.log("URL cambiada a", domain); // debug
            }

        } catch (error) {
            if (currentDomain !== tab.url) {
                switchTab();
                currentDomain = tab.url;
                // console.log("URL cambiada a:", tab.url); // debug
                
            }
            
        }
    }
});