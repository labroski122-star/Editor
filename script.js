// Estraiamo le funzioni necessarie dalla libreria FFmpeg
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ 
    log: true, // Abilita i log nella console del browser, utile per il debug
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js' // Specifica il percorso del core
});

// Selezioniamo gli elementi dalla pagina HTML
const imageUpload = document.getElementById('imageUpload');
const audioUpload = document.getElementById('audioUpload');
const convertButton = document.getElementById('convertButton');
const statusText = document.getElementById('statusText');
const loadingSpinner = document.getElementById('loading');
const downloadLink = document.getElementById('downloadLink');

// Variabile per sapere se ffmpeg è stato caricato
let ffmpegLoaded = false;

// Funzione per caricare FFmpeg
const loadFFmpeg = async () => {
    if (ffmpegLoaded) return; // Se già caricato, non fare nulla
    
    statusText.textContent = 'Caricamento di FFmpeg (~30MB)...';
    loadingSpinner.classList.remove('hidden');
    try {
        await ffmpeg.load();
        ffmpegLoaded = true;
        statusText.textContent = 'FFmpeg caricato. Pronto a convertire.';
    } catch (error) {
        console.error("Errore durante il caricamento di FFmpeg:", error);
        statusText.textContent = 'Errore nel caricamento di FFmpeg. Ricarica la pagina.';
    }
    loadingSpinner.classList.add('hidden');
};

// Proviamo a caricare FFmpeg non appena la pagina è pronta
loadFFmpeg();

// Funzione principale di conversione
const convertToMp4 = async () => {
    // 1. Controlla che i file siano stati selezionati
    const imageFile = imageUpload.files[0];
    const audioFile = audioUpload.files[0];

    if (!imageFile || !audioFile) {
        alert('Per favore carica sia un file immagine che un file audio.');
        return;
    }

    // 2. Assicurati che FFmpeg sia carico
    if (!ffmpegLoaded) {
        await loadFFmpeg();
        if (!ffmpegLoaded) return; // Se il caricamento fallisce, interrompi
    }

    // 3. Disabilita il pulsante e mostra lo stato
    convertButton.disabled = true;
    downloadLink.classList.add('hidden'); // Nascondi il vecchio link di download
    statusText.textContent = 'Lettura file...';
    loadingSpinner.classList.remove('hidden');

    try {
        // 4. Scriviamo i file nel "file system" virtuale di FFmpeg
        const imageName = imageFile.name;
        const audioName = audioFile.name;

        ffmpeg.FS('writeFile', imageName, await fetchFile(imageFile));
        ffmpeg.FS('writeFile', audioName, await fetchFile(audioFile));

        statusText.textContent = 'Conversione in corso... Questo potrebbe richiedere alcuni minuti.';

        // 5. Eseguiamo il comando FFmpeg!
        // Spiegazione comando:
        // -loop 1          : Mette in loop l'input video (l'immagine)
        // -i [imageName]   : Specifica l'immagine come primo input
        // -i [audioName]   : Specifica l'audio come secondo input
        // -c:v libx264     : Usa il codec video H.264
        // -pix_fmt yuv420p : Formato pixel standard per massima compatibilità
        // -c:a aac         : Usa il codec audio AAC (molto comune)
        // -b:a 192k        : Bitrate audio di 192k
        // -shortest        : Fa terminare il video quando l'input più corto (l'audio) finisce
        await ffmpeg.run(
            '-loop', '1',
            '-i', imageName,
            '-i', audioName,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            'output.mp4'
        );

        // 6. Lettura del file MP4 risultante
        statusText.textContent = 'Elaborazione file di output...';
        const data = ffmpeg.FS('readFile', 'output.mp4');

        // 7. Creazione di un link per il download
        // Creiamo un "Blob" (un oggetto binario) e poi un URL per quel Blob
        const videoUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

        downloadLink.href = videoUrl;
        downloadLink.classList.remove('hidden'); // Mostra il link
        statusText.textContent = 'Conversione completata!';

        // 8. (Opzionale) Pulizia dei file virtuali per liberare memoria
        ffmpeg.FS('unlink', imageName);
        ffmpeg.FS('unlink', audioName);
        ffmpeg.FS('unlink', 'output.mp4');

    } catch (error) {
        console.error('Errore durante la conversione:', error);
        statusText.textContent = `Errore durante la conversione: ${error.message || error}`;
    } finally {
        // Riabilita il pulsante e nascondi lo spinner
        convertButton.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
};

// Colleghiamo la funzione al click del pulsante
convertButton.addEventListener('click', convertToMp4);
