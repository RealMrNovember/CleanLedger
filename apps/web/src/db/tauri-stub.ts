/** Web build stub — Tauri SQL plugin is desktop-only. */
export default {
  load: async (_name: string) => {
    throw new Error("SQLite is not available in the web client.");
  },
};
