interface ImportMetaEnv {
  /** true under `npm run dev`; replaced by `false` in a build, which is what keeps the fake drive out of one */
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
