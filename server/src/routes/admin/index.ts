export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/fields/:uid',
      handler: 'export.fields',
      config: {
        policies: ['admin::isAuthenticatedAdmin', 'plugin::data-exporter.has-export-permission'],
      },
    },
    {
      method: 'POST',
      path: '/export',
      handler: 'export.run',
      config: {
        policies: ['admin::isAuthenticatedAdmin', 'plugin::data-exporter.has-export-permission'],
      },
    },
  ],
};
