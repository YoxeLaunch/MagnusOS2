/// <reference types="vite/client" />

// Vite Web Worker import declarations
declare module '*?worker' {
    const workerConstructor: {
        new(): Worker;
    };
    export default workerConstructor;
}

declare module '*?worker&inline' {
    const workerConstructor: {
        new(): Worker;
    };
    export default workerConstructor;
}
