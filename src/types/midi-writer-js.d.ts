declare module "midi-writer-js" {
  // midi-writer-js ships types, but the package.json export structure can confuse TS
  // during Next/Turbopack builds. We only need this module at runtime.
  const MidiWriter: any;
  export default MidiWriter;
}

