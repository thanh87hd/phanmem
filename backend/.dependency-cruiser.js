/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /* Rule 1: Cấm circular dependency */
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Cảnh báo phụ thuộc vòng giữa các modules/files',
      from: {},
      to: {
        circular: true,
      },
    },

    /* Rule 2: Cấm module nghiệp vụ import ngược AppModule */
    {
      name: 'no-app-module-import',
      severity: 'error',
      comment: 'Cấm các module nghiệp vụ con import ngược lại AppModule (ngoại trừ main, app core và standalone scripts)',
      from: {
        path: '^src/(?!main\\.ts|app\\.controller\\.ts|app\\.service\\.ts|scripts/).*',
      },
      to: {
        path: '^src/app\\.module\\.ts$',
      },
    },

    /* Rule 3: Cấm import entity xuyên domain trực tiếp không qua module export */
    {
      name: 'no-cross-domain-direct-entity-import',
      severity: 'warn',
      comment: 'Hạn chế import entity từ domain khác mà không thông qua abstraction',
      from: {
        path: '^src/([a-zA-Z0-9_-]+)/.*',
      },
      to: {
        path: '^src/(?!$1/)([a-zA-Z0-9_-]+)/entities/.*\\.entity\\.ts$',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    includeOnly: '^src',
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
