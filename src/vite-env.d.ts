/// <reference types="vite/client" />

declare module '*.scss?raw' {
  const content: string
  export default content
}
