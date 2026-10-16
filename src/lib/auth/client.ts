"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin by default, so the browser calls /api/auth/* on this deployment.
export const authClient = createAuthClient();
