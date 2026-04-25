// O runtime precisa importar do build ESM direto pra contornar a package.json
// malformada do youtube-transcript. Aqui fazemos o TS reusar os types oficiais
// do subpath padrão.
declare module "youtube-transcript/dist/youtube-transcript.esm.js" {
  export * from "youtube-transcript";
}
