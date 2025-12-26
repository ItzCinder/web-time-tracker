// background.js

console.log("El cerebro (background.js) ha empezado a funcionar.");

let counterInterval = null;
let elapsedTime = 0; 
let currentDomain = '';
let historial = [];


function saveToHistory(domain, timeSpent) {
    // Buscar si ya existe el dominio en el historial
    const existingEntry = historial.find(entry => entry.web === domain);

    if (existingEntry) {
        // Si existe, sumar el tiempo
        existingEntry.time += timeSpent;
    } else {
        // Si no existe, crear nueva entrada
        historial.push({
            web: domain,
            time: timeSpent
        });
    }
}

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

// funcion contador
// Cambia de pestaña: guarda tiempo anterior e inicia nuevo contador
function switchTab(){
    
    // Si hay contador activo, detener el Interval
    if (counterInterval) {

        // Guardar el tiempo de la pestaña anterior en el historial
        if (currentDomain && elapsedTime > 0){
            saveToHistory(currentDomain, elapsedTime);
            console.log("Historial actualizado:", historial);
        }
        clearInterval(counterInterval);

    }

    elapsedTime = 0;

    counterInterval = setInterval(() =>{
        elapsedTime++;
        console.log(`Tiempo en esta pestaña:`, formatTime(elapsedTime));

    }, 1000); // 1000 ms = 1 segundo
}




// Este evento se dispara cada vez que el usuario cambia a una pestaña diferente.
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
                console.log("Pestaña cambiada a:", domain);
                currentDomain = domain;
                

            } catch (error){
                // Manejamos este error para paginas donde no tienen hostname, como URLs internas del navegador
                switchTab();
                currentDomain = tab.url;
                console.log("Pestaña cambiada a:", tab.url);
                
            }
        }
    });
});

// Detecta cuando la URL cambia en la misma pestaña
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
                console.log("URL cambiada a", domain);
            }

        } catch (error) {
            if (currentDomain !== tab.url) {
                switchTab();
                currentDomain = tab.url;
                console.log("URL cambiada a:", tab.url);
                
            }
            
        }
    }
});


