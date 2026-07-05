/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Injected by Vite `define` from package.json at build time
declare const __APP_VERSION__: string;
