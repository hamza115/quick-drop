// Small UI preferences shared by server and client code (kept out of "use client" modules, whose
// exports reach server components as client references rather than values).

/** Cookie that remembers whether the desktop sidebar is collapsed, so the server renders the right width. */
export const SIDEBAR_COOKIE = "qd_sidebar";
