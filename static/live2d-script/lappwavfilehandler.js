var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

export let s_instance = null;

export class LAppWavFileHandler {
    static getInstance() {
        if (s_instance == null) {
            s_instance = new LAppWavFileHandler();
        }
        return s_instance;
    }
    static releaseInstance() {
        if (s_instance != null) {
            s_instance = void 0;
        }
        s_instance = null;
    }
    
    // Méthode de mise à jour de la lecture
    update(deltaTimeSeconds) {
        let goalOffset;
        let rms;
        if (this._pcmData == null ||
            this._sampleOffset >= this._wavFileInfo._samplesPerChannel) {
            this._lastRms = 0.0;
            return false;
        }
        this._userTimeSeconds += deltaTimeSeconds;
        goalOffset = Math.floor(this._userTimeSeconds * this._wavFileInfo._samplingRate);
        if (goalOffset > this._wavFileInfo._samplesPerChannel) {
            goalOffset = this._wavFileInfo._samplesPerChannel;
        }
        rms = 0.0;
        for (let channelCount = 0; channelCount < this._wavFileInfo._numberOfChannels; channelCount++) {
            for (let sampleCount = this._sampleOffset; sampleCount < goalOffset; sampleCount++) {
                const pcm = this._pcmData[channelCount][sampleCount];
                rms += pcm * pcm;
            }
        }
        rms = Math.sqrt(rms /
            (this._wavFileInfo._numberOfChannels *
             (goalOffset - this._sampleOffset)));
        this._lastRms = rms;
        this._sampleOffset = goalOffset;
        return true;
    }
    
    // Démarrage de la lecture (ou du chargement)
    // Pour un fichier brut, il faut fournir les paramètres pour créer le header
    start(filePath, sampleRate = 44100, numChannels = 2, bitsPerSample = 16) {
        this._sampleOffset = 0;
        this._userTimeSeconds = 0.0;
        this._lastRms = 0.0;
        this.loadWavFile(filePath, sampleRate, numChannels, bitsPerSample);
    }
    
    // Récupération du niveau RMS
    getRms() {
        return this._lastRms*2;
    }
    
    // Chargement du fichier WAV ou de données brutes
    // Si le header RIFF est absent, on le crée avec createWavHeader et on concatène
    loadWavFile(filePath, sampleRate, numChannels, bitsPerSample) {
        return new Promise(resolveValue => {
            let ret = false;
            const asyncFileLoad = () => __awaiter(this, void 0, void 0, function* () {
                return fetch(filePath).then(response => response.arrayBuffer());
            });
            const asyncWavFileManager = (() => __awaiter(this, void 0, void 0, function* () {
                let fileBuffer = yield asyncFileLoad();
                // Vérification du header : on regarde les 4 premiers octets
                const fileView = new DataView(fileBuffer);
                let signature = "";
                for (let i = 0; i < 4; i++) {
                    signature += String.fromCharCode(fileView.getUint8(i));
                }
                // Si le fichier ne commence pas par "RIFF", on le considère comme brut
                if (signature !== "RIFF") {
                    console.log("Header RIFF absent, création d'un header WAV.");
                    // Calculer le nombre d'échantillons à partir de la taille du fichier brut et des paramètres
                    const bytesPerSample = bitsPerSample / 8;
                    const numSamples = fileBuffer.byteLength / (numChannels * bytesPerSample);
                    // Créer l'en-tête WAV
                    const header = this.createWavHeader(sampleRate, numChannels, numSamples);
                    // Concaténer l'en-tête et les données brutes
                    const wavBuffer = new Uint8Array(header.byteLength + fileBuffer.byteLength);
                    wavBuffer.set(new Uint8Array(header), 0);
                    wavBuffer.set(new Uint8Array(fileBuffer), header.byteLength);
                    fileBuffer = wavBuffer.buffer;
                }
                // Initialisation du ByteReader avec le buffer complet
                this._byteReader._fileByte = fileBuffer;
                this._byteReader._fileDataView = new DataView(this._byteReader._fileByte);
                this._byteReader._fileSize = this._byteReader._fileByte.byteLength;
                this._byteReader._readOffset = 0;
                if (this._byteReader._fileByte == null || this._byteReader._fileSize < 4) {
                    resolveValue(false);
                    return;
                }
                this._wavFileInfo._fileName = filePath;
                try {
                    if (!this._byteReader.getCheckSignature('RIFF')) {
                        ret = false;
                        throw new Error('Cannot find Signature "RIFF".');
                    }
                    this._byteReader.get32LittleEndian();
                    if (!this._byteReader.getCheckSignature('WAVE')) {
                        ret = false;
                        throw new Error('Cannot find Signature "WAVE".');
                    }
                    if (!this._byteReader.getCheckSignature('fmt ')) {
                        ret = false;
                        throw new Error('Cannot find Signature "fmt ".');
                    }
                    const fmtChunkSize = this._byteReader.get32LittleEndian();
                    if (this._byteReader.get16LittleEndian() != 1) {
                        ret = false;
                        throw new Error('File is not linear PCM.');
                    }
                    this._wavFileInfo._numberOfChannels = this._byteReader.get16LittleEndian();
                    this._wavFileInfo._samplingRate = this._byteReader.get32LittleEndian();
                    this._byteReader.get32LittleEndian();
                    this._byteReader.get16LittleEndian();
                    this._wavFileInfo._bitsPerSample = this._byteReader.get16LittleEndian();
                    if (fmtChunkSize > 16) {
                        this._byteReader._readOffset += fmtChunkSize - 16;
                    }
                    while (!this._byteReader.getCheckSignature('data') &&
                           this._byteReader._readOffset < this._byteReader._fileSize) {
                        this._byteReader._readOffset += this._byteReader.get32LittleEndian() + 4;
                    }
                    if (this._byteReader._readOffset >= this._byteReader._fileSize) {
                        ret = false;
                        throw new Error('Cannot find "data" Chunk.');
                    }
                    {
                        const dataChunkSize = this._byteReader.get32LittleEndian();
                        this._wavFileInfo._samplesPerChannel =
                            (dataChunkSize * 8) / (this._wavFileInfo._bitsPerSample *
                                                    this._wavFileInfo._numberOfChannels);
                    }
                    this._pcmData = new Array(this._wavFileInfo._numberOfChannels);
                    for (let channelCount = 0; channelCount < this._wavFileInfo._numberOfChannels; channelCount++) {
                        this._pcmData[channelCount] = new Float32Array(this._wavFileInfo._samplesPerChannel);
                    }
                    for (let sampleCount = 0; sampleCount < this._wavFileInfo._samplesPerChannel; sampleCount++) {
                        for (let channelCount = 0; channelCount < this._wavFileInfo._numberOfChannels; channelCount++) {
                            this._pcmData[channelCount][sampleCount] = this.getPcmSample();
                        }
                    }
                    ret = true;
                    resolveValue(ret);
                }
                catch (e) {
                    console.log(e);
                }
            }))().then(() => {
                resolveValue(ret);
            });
        });
    }
    
    // Récupération d'un échantillon PCM
    getPcmSample() {
        let pcm32;
        switch (this._wavFileInfo._bitsPerSample) {
            case 8:
                pcm32 = this._byteReader.get8() - 128;
                pcm32 <<= 24;
                break;
            case 16:
                pcm32 = this._byteReader.get16LittleEndian() << 16;
                break;
            case 24:
                pcm32 = this._byteReader.get24LittleEndian() << 8;
                break;
            default:
                pcm32 = 0;
                break;
        }
        return pcm32 / 2147483647;
    }
    
    // Retourne une copie du canal PCM spécifié
    getPcmDataChannel(usechannel) {
        if (!this._pcmData || !(usechannel < this._pcmData.length)) {
            return null;
        }
        return Float32Array.from(this._pcmData[usechannel]);
    }
    
    // Retourne la fréquence d'échantillonnage du WAV
    getWavSamplingRate() {
        if (!this._wavFileInfo || this._wavFileInfo._samplingRate < 1) {
            return null;
        }
        return this._wavFileInfo._samplingRate;
    }
    
    // Libération des données PCM
    releasePcmData() {
        for (let channelCount = 0; channelCount < this._wavFileInfo._numberOfChannels; channelCount++) {
            this._pcmData[channelCount] = null;
        }
        delete this._pcmData;
        this._pcmData = null;
    }
    
    // Fonction pour créer un header WAV (RIFF)
    createWavHeader(sampleRate, numChannels, numSamples) {
        const header = new ArrayBuffer(44);
        const view = new DataView(header);
        const blockAlign = numChannels * 2; // 16 bits par échantillon = 2 octets
        const byteRate = sampleRate * blockAlign;
        const dataSize = numSamples * blockAlign;
        
        function writeString(offset, str) {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        }
        
        writeString(0, "RIFF");
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true); // taille du chunk "fmt" pour PCM
        view.setUint16(20, 1, true);   // format PCM = 1
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);  // bits par échantillon
        writeString(36, "data");
        view.setUint32(40, dataSize, true);
        
        return header;
    }
    
    constructor() {
        this.loadFiletoBytes = (arrayBuffer, length) => {
            this._byteReader._fileByte = arrayBuffer;
            this._byteReader._fileDataView = new DataView(this._byteReader._fileByte);
            this._byteReader._fileSize = length;
        };
        this._pcmData = null;
        this._userTimeSeconds = 0.0;
        this._lastRms = 0.0;
        this._sampleOffset = 0.0;
        this._wavFileInfo = new WavFileInfo();
        this._byteReader = new ByteReader();
    }
}

export class WavFileInfo {
    constructor() {
        this._fileName = '';
        this._numberOfChannels = 0;
        this._bitsPerSample = 0;
        this._samplingRate = 0;
        this._samplesPerChannel = 0;
    }
}

export class ByteReader {
    constructor() {
        this._fileByte = null;
        this._fileDataView = null;
        this._fileSize = 0;
        this._readOffset = 0;
    }
    get8() {
        const ret = this._fileDataView.getUint8(this._readOffset);
        this._readOffset++;
        return ret;
    }
    get16LittleEndian() {
        const ret = (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
                    this._fileDataView.getUint8(this._readOffset);
        this._readOffset += 2;
        return ret;
    }
    get24LittleEndian() {
        const ret = (this._fileDataView.getUint8(this._readOffset + 2) << 16) |
                    (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
                    this._fileDataView.getUint8(this._readOffset);
        this._readOffset += 3;
        return ret;
    }
    get32LittleEndian() {
        const ret = (this._fileDataView.getUint8(this._readOffset + 3) << 24) |
                    (this._fileDataView.getUint8(this._readOffset + 2) << 16) |
                    (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
                    this._fileDataView.getUint8(this._readOffset);
        this._readOffset += 4;
        return ret;
    }
    getCheckSignature(reference) {
        const getSignature = new Uint8Array(4);
        const referenceString = new TextEncoder().encode(reference);
        if (reference.length != 4) {
            return false;
        }
        for (let signatureOffset = 0; signatureOffset < 4; signatureOffset++) {
            getSignature[signatureOffset] = this.get8();
        }
        return (getSignature[0] === referenceString[0] &&
                getSignature[1] === referenceString[1] &&
                getSignature[2] === referenceString[2] &&
                getSignature[3] === referenceString[3]);
    }
}
//# sourceMappingURL=lappwavfilehandler.js.map
