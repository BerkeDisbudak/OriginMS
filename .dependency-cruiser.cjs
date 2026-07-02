/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "ui-not-to-domain",
      severity: "error",
      comment: "STACK_SPEC section 2: ui cannot import HRMS domain logic.",
      from: { path: "^frontend/src/ui/" },
      to: { path: "^frontend/src/domain/" },
    },
    {
      name: "ui-not-to-api",
      severity: "error",
      comment: "STACK_SPEC section 2: ui cannot import generated API code.",
      from: { path: "^frontend/src/ui/" },
      to: { path: "^frontend/src/api/" },
    },
    {
      name: "features-not-to-app",
      severity: "error",
      comment: "STACK_SPEC section 2: features cannot import route shell code.",
      from: { path: "^frontend/src/features/" },
      to: { path: "^frontend/src/app/" },
    },
    {
      name: "api-not-to-ui",
      severity: "error",
      comment: "STACK_SPEC section 2: api cannot import UI code.",
      from: { path: "^frontend/src/api/" },
      to: { path: "^frontend/src/ui/" },
    },
    {
      name: "api-not-to-features",
      severity: "error",
      comment: "STACK_SPEC section 2: api cannot import feature compositions.",
      from: { path: "^frontend/src/api/" },
      to: { path: "^frontend/src/features/" },
    },
    {
      name: "domain-not-to-react",
      severity: "error",
      comment: "STACK_SPEC section 2: domain is pure TypeScript and cannot import React.",
      from: { path: "^frontend/src/domain/" },
      to: { dependencyTypes: ["npm"], path: "^(react|react-dom)$" },
    },
    {
      name: "domain-not-to-ui",
      severity: "error",
      comment: "STACK_SPEC section 2: domain cannot import UI code.",
      from: { path: "^frontend/src/domain/" },
      to: { path: "^frontend/src/ui/" },
    },
    {
      name: "domain-not-to-api",
      severity: "error",
      comment: "STACK_SPEC section 2: domain cannot import API runtime code.",
      from: { path: "^frontend/src/domain/" },
      to: { path: "^frontend/src/api/(?!generated/.*types\\.gen)" },
    },
    {
      name: "domain-not-to-lib",
      severity: "error",
      comment: "STACK_SPEC section 2: domain cannot import lib.",
      from: { path: "^frontend/src/domain/" },
      to: { path: "^frontend/src/lib/" },
    },
    {
      name: "app-not-to-api",
      severity: "error",
      comment: "STACK_SPEC section 2: app routes cannot import API directly.",
      from: { path: "^frontend/src/app/" },
      to: { path: "^frontend/src/api/" },
    },
    {
      name: "app-not-to-domain",
      severity: "error",
      comment: "STACK_SPEC section 2: app routes cannot import domain directly.",
      from: { path: "^frontend/src/app/" },
      to: { path: "^frontend/src/domain/" },
    },
    {
      name: "motion-only-in-ui-motion",
      severity: "error",
      comment: "MOTION_SPEC section 1: motion/react imports are isolated to ui/motion.",
      from: { pathNot: "^frontend/src/ui/motion/" },
      to: { dependencyTypes: ["npm"], path: "^motion/react$" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "^frontend/src/api/generated/",
    },
    tsConfig: {
      fileName: "tsconfig.base.json",
    },
    tsPreCompilationDeps: true,
  },
};
