declare module 'qrcode' {
  interface QrBitMatrix {
    size: number
    get(row: number, col: number): number
  }

  interface QrSymbol {
    version: number
    modules: QrBitMatrix
  }

  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ): QrSymbol
}
