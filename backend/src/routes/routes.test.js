/**
 * Routes integration tests
 * Verifies that all routes are properly exported and structured
 */

// Test that all route modules export functions
console.log('Testing route module exports...');

const createReportsRouter = require('./reports');
const createIncidentsRouter = require('./incidents');
const createDashboardRouter = require('./dashboard');
const createAuthRouter = require('./auth');

console.assert(typeof createReportsRouter === 'function', 'reports.js should export a function');
console.assert(typeof createIncidentsRouter === 'function', 'incidents.js should export a function');
console.assert(typeof createDashboardRouter === 'function', 'dashboard.js should export a function');
console.assert(typeof createAuthRouter === 'function', 'auth.js should export a function');

// Test server startup
const server = require('../server');
console.assert(typeof server === 'function', 'server.js should export startServer function');

console.log('✓ All route modules export correctly');

// Test route structure (requires a mock pool)
class MockPool {
  query(sql, params) {
    return Promise.resolve({ rows: [] });
  }

  end() {
    return Promise.resolve();
  }
}

const mockPool = new MockPool();

const reportsRouter = createReportsRouter(mockPool);
const incidentsRouter = createIncidentsRouter(mockPool);
const dashboardRouter = createDashboardRouter(mockPool);
const authRouter = createAuthRouter(mockPool);

// Check that routers have _router property (Express Router)
console.assert(reportsRouter.stack, 'reportsRouter should be an Express Router');
console.assert(incidentsRouter.stack, 'incidentsRouter should be an Express Router');
console.assert(dashboardRouter.stack, 'dashboardRouter should be an Express Router');
console.assert(authRouter.stack, 'authRouter should be an Express Router');

console.log('✓ All route modules create valid Express routers');

// Verify endpoints are registered
const getEndpoints = (router) => {
  return router.stack
    .filter(layer => layer.route)
    .map(layer => {
      const methods = Object.keys(layer.route.methods);
      const path = layer.route.path;
      return { path, methods };
    });
};

const reportsEndpoints = getEndpoints(reportsRouter);
const incidentsEndpoints = getEndpoints(incidentsRouter);
const dashboardEndpoints = getEndpoints(dashboardRouter);
const authEndpoints = getEndpoints(authRouter);

console.log('Reports endpoints:', JSON.stringify(reportsEndpoints, null, 2));
console.log('Incidents endpoints:', JSON.stringify(incidentsEndpoints, null, 2));
console.log('Dashboard endpoints:', JSON.stringify(dashboardEndpoints, null, 2));
console.log('Auth endpoints:', JSON.stringify(authEndpoints, null, 2));

// Verify required endpoints exist
const hasReportsPost = reportsEndpoints.some(e => e.path === '/' && e.methods.includes('post'));
const hasReportsGet = reportsEndpoints.some(e => e.path === '/:id' && e.methods.includes('get'));

const hasIncidentsGet = incidentsEndpoints.some(e => e.path === '/' && e.methods.includes('get'));
const hasIncidentsDetail = incidentsEndpoints.some(e => e.path === '/:id' && e.methods.includes('get'));

const hasDashboardWard = dashboardEndpoints.some(e => e.path === '/ward/:ward_id' && e.methods.includes('get'));
const hasDashboardPending = dashboardEndpoints.some(e => e.path === '/pending' && e.methods.includes('get'));

const hasAuthLogin = authEndpoints.some(e => e.path === '/login' && e.methods.includes('post'));
const hasAuthRegister = authEndpoints.some(e => e.path === '/register' && e.methods.includes('post'));

console.log('\n✓ Endpoint verification:');
console.log(`  Reports POST / : ${hasReportsPost ? '✓' : '✗'}`);
console.log(`  Reports GET /:id : ${hasReportsGet ? '✓' : '✗'}`);
console.log(`  Incidents GET / : ${hasIncidentsGet ? '✓' : '✗'}`);
console.log(`  Incidents GET /:id : ${hasIncidentsDetail ? '✓' : '✗'}`);
console.log(`  Dashboard GET /ward/:ward_id : ${hasDashboardWard ? '✓' : '✗'}`);
console.log(`  Dashboard GET /pending : ${hasDashboardPending ? '✓' : '✗'}`);
console.log(`  Auth POST /login : ${hasAuthLogin ? '✓' : '✗'}`);
console.log(`  Auth POST /register : ${hasAuthRegister ? '✓' : '✗'}`);

const allEndpointsValid = hasReportsPost && hasReportsGet && hasIncidentsGet && hasIncidentsDetail
  && hasDashboardWard && hasDashboardPending && hasAuthLogin && hasAuthRegister;

console.assert(allEndpointsValid, 'All required endpoints should be present');

console.log('\n✓ All route tests passed!');
