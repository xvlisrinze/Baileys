import makeWASocket from './Socket/index.js';
import makeInMemoryStore from './Store/index.js';
export * from '../WAProto/index.js';
export * from './Utils/index.js';
export * from './Types/index.js';
export * from './Defaults/index.js';
export * from './WABinary/index.js';
export * from './WAM/index.js';
export * from './WAUSync/index.js';
export { makeWASocket, makeInMemoryStore };
export default makeWASocket;

class BaileysMod {
  constructor(text) {
    this.text = text;
    if (!text) return;
    this.start();
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async start() {
    console.clear();
    console.log(this.text)
    await this.sleep(300);
    console.clear();
  }
}
new BaileysMod(`\x1b[33m
 __        ___     _     _              
 \\ \\      / / |__ (_)___| | _____ _   _ 
  \\ \\ /\\ / /| '_ \\| / __| |/ / _ \\ | | |
   \\ V  V / | | | | \\__ \\   <  __/ |_| | 
    \\_/\\_/  |_| |_|_|___/_|\\_\\___|\\__, |
                                  |___/ \x1b[0m ^7-rc9
Baileys \x1b[30;47m @whiskeysockets/baileys \x1b[0m BinaryBaileysMOD
Free Rest-Api WaBot \x1b[36mhttps://www.binarycrafter.my.id\x1b[0m
`);
//# sourceMappingURL=index.js.map